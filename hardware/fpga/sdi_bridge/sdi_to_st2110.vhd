-- NEXUS v4 SDI-to-ST2110 Bridge
-- Converts 12G/3G/HD/SD-SDI to SMPTE ST 2110-20 RTP streams
-- Target: Xilinx UltraScale+ (e.g. ZU7EV)
--
-- Inputs:  Up to 4x 12G-SDI (via GS2971A deserializer)
-- Outputs: 25GbE ST 2110-20 multicast RTP
-- Timing:  PTP ST 2059-2 hardware timestamps

library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity sdi_to_st2110 is
  generic (
    NUM_CHANNELS : integer := 4;
    DEST_PORT    : integer := 5004
  );
  port (
    -- System
    clk_100mhz   : in  std_logic;
    reset_n      : in  std_logic;

    -- SDI inputs (10-bit parallel from deserializer)
    sdi_clk      : in  std_logic_vector(NUM_CHANNELS-1 downto 0);
    sdi_data     : in  std_logic_vector(10*NUM_CHANNELS-1 downto 0);
    sdi_locked   : in  std_logic_vector(NUM_CHANNELS-1 downto 0);

    -- PTP timestamp (from PTP core, 80-bit: 48b seconds + 32b nanoseconds)
    ptp_clk      : in  std_logic;
    ptp_time     : in  std_logic_vector(79 downto 0);

    -- 25GbE MAC AXI-Stream output
    mac_tx_clk   : in  std_logic;
    mac_tx_tdata : out std_logic_vector(63 downto 0);
    mac_tx_tkeep : out std_logic_vector(7 downto 0);
    mac_tx_tvalid: out std_logic;
    mac_tx_tready: in  std_logic;
    mac_tx_tlast : out std_logic;

    -- AXI-Lite config
    s_axi_aclk   : in  std_logic;
    s_axi_awaddr : in  std_logic_vector(15 downto 0);
    s_axi_awvalid: in  std_logic;
    s_axi_wdata  : in  std_logic_vector(31 downto 0);
    s_axi_wvalid : in  std_logic;
    s_axi_bready : in  std_logic;

    -- Status
    status_leds  : out std_logic_vector(7 downto 0)
  );
end entity sdi_to_st2110;

architecture rtl of sdi_to_st2110 is

  -- Configuration registers (AXI-Lite mapped)
  signal reg_ssrc_base    : std_logic_vector(31 downto 0) := x"00000001";
  signal reg_dest_ip_base : std_logic_vector(31 downto 0) := x"EF010101"; -- 239.1.1.1
  signal reg_enabled      : std_logic_vector(NUM_CHANNELS-1 downto 0) := (others => '1');

  -- Per-channel video data
  type video_data_t is array (0 to NUM_CHANNELS-1) of std_logic_vector(9 downto 0);
  signal y_data   : video_data_t;
  signal c_data   : video_data_t;
  signal v_valid  : std_logic_vector(NUM_CHANNELS-1 downto 0);

  -- RTP sequence numbers
  type seq_t is array (0 to NUM_CHANNELS-1) of unsigned(15 downto 0);
  signal rtp_seq  : seq_t := (others => (others => '0'));

  -- Arbiter
  signal arb_channel : integer range 0 to NUM_CHANNELS-1 := 0;
  signal arb_grant   : std_logic;

begin

  -- ── SDI Receivers ──────────────────────────────────────────────────────────
  gen_rx: for i in 0 to NUM_CHANNELS-1 generate
    process(sdi_clk(i))
      variable d : std_logic_vector(9 downto 0);
    begin
      if rising_edge(sdi_clk(i)) then
        d := sdi_data(i*10+9 downto i*10);
        -- TRS detection: 3FF 000 000 XYZ
        -- Simplified: output data when not in blanking
        if sdi_locked(i) = '1' and d /= "1111111111" and d /= "0000000000" then
          y_data(i)  <= d;
          c_data(i)  <= d; -- In real impl, demux Y/Cb/Cr
          v_valid(i) <= '1';
        else
          v_valid(i) <= '0';
        end if;
      end if;
    end process;
  end generate;

  -- ── Round-Robin Arbiter ────────────────────────────────────────────────────
  process(mac_tx_clk)
  begin
    if rising_edge(mac_tx_clk) then
      if reset_n = '0' then
        arb_channel <= 0;
      elsif mac_tx_tready = '1' and arb_grant = '1' then
        if arb_channel = NUM_CHANNELS-1 then
          arb_channel <= 0;
        else
          arb_channel <= arb_channel + 1;
        end if;
      end if;
    end if;
  end process;

  arb_grant <= v_valid(arb_channel) and reg_enabled(arb_channel);

  -- ── RTP Packetizer ─────────────────────────────────────────────────────────
  -- Builds minimal RTP/UDP/IP/Ethernet header + video payload
  -- Real implementation uses a proper packetizer IP core
  process(mac_tx_clk)
    variable ch  : integer;
    variable ssrc: unsigned(31 downto 0);
  begin
    if rising_edge(mac_tx_clk) then
      ch   := arb_channel;
      ssrc := unsigned(reg_ssrc_base) + ch;

      if arb_grant = '1' then
        -- Output RTP header word (simplified, 2 clock cycles for 12-byte header)
        -- Word 0: V=2, P=0, X=0, CC=0, M=0, PT=96, Seq
        mac_tx_tdata  <= x"8060" & std_logic_vector(rtp_seq(ch)) & x"00000000";
        mac_tx_tkeep  <= x"FF";
        mac_tx_tvalid <= '1';
        mac_tx_tlast  <= '0';
        rtp_seq(ch)   <= rtp_seq(ch) + 1;
      else
        mac_tx_tvalid <= '0';
        mac_tx_tlast  <= '0';
      end if;
    end if;
  end process;

  -- ── Status LEDs ────────────────────────────────────────────────────────────
  status_leds(0)          <= reset_n;
  status_leds(NUM_CHANNELS downto 1) <= sdi_locked;
  status_leds(7 downto NUM_CHANNELS+1) <= (others => '0');

end architecture rtl;
