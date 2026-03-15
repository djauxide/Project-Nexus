use anyhow::Result;
use axum::{extract::State, http::StatusCode, response::Json, routing::{get, post}, Router};
use metrics::{counter, gauge};
use metrics_exporter_prometheus::PrometheusBuilder;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, RwLock},
    time::{Duration, Instant},
};
use tokio::signal;
use tracing::{info, warn};
use uuid::Uuid;

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Flow {
    pub id: String,
    pub source_ip: String,
    pub dest_ip: String,
    pub dest_port: u16,
    pub format: String,
    pub bitrate_mbps: f64,
    pub dropped_packets: u64,
    pub ptp_offset_ns: i64,
    pub active: bool,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Crosspoint {
    pub source_id: String,
    pub dest_id: String,
    pub multicast_group: String,
    pub port: u16,
    pub active: bool,
}

#[derive(Debug, Deserialize)]
pub struct ConnectRequest {
    pub sender_id: String,
    pub receiver_id: String,
}

#[derive(Debug, Serialize)]
pub struct ConnectResponse {
    pub connection_id: String,
    pub multicast_group: String,
    pub port: u16,
}

#[derive(Debug, Serialize)]
pub struct RouterStats {
    pub active_flows: usize,
    pub active_crosspoints: usize,
    pub total_bitrate_gbps: f64,
    pub ptp_locked: bool,
    pub ptp_offset_ns: i64,
}

// ── State ─────────────────────────────────────────────────────────────────────

#[derive(Default)]
pub struct RouterState {
    flows: HashMap<String, Flow>,
    crosspoints: HashMap<String, Crosspoint>,
    ptp_offset_ns: i64,
    ptp_locked: bool,
    multicast_pool: u32, // next available multicast address offset
}

type SharedState = Arc<RwLock<RouterState>>;

// ── Handlers ──────────────────────────────────────────────────────────────────

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({"status": "healthy"}))
}

async fn get_flows(State(state): State<SharedState>) -> Json<Vec<Flow>> {
    let s = state.read().unwrap();
    Json(s.flows.values().cloned().collect())
}

async fn connect_flow(
    State(state): State<SharedState>,
    Json(req): Json<ConnectRequest>,
) -> Result<Json<ConnectResponse>, StatusCode> {
    let mut s = state.write().unwrap();

    // Allocate multicast group from pool (239.1.x.x range)
    let offset = s.multicast_pool;
    s.multicast_pool += 1;
    let multicast_group = format!("239.1.{}.{}", (offset >> 8) & 0xFF, offset & 0xFF);
    let port = 5004u16;

    let connection_id = Uuid::new_v4().to_string();
    let crosspoint = Crosspoint {
        source_id: req.sender_id.clone(),
        dest_id: req.receiver_id.clone(),
        multicast_group: multicast_group.clone(),
        port,
        active: true,
    };

    s.crosspoints.insert(connection_id.clone(), crosspoint);

    // Create flow entry
    let flow = Flow {
        id: connection_id.clone(),
        source_ip: req.sender_id.clone(),
        dest_ip: multicast_group.clone(),
        dest_port: port,
        format: "video/raw".to_string(),
        bitrate_mbps: 1485.0, // 1080i50 uncompressed
        dropped_packets: 0,
        ptp_offset_ns: s.ptp_offset_ns,
        active: true,
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };
    s.flows.insert(connection_id.clone(), flow);

    counter!("nexus_router.connections.total", 1);
    gauge!("nexus_router.connections.active", s.crosspoints.len() as f64);

    info!(
        connection_id = %connection_id,
        sender = %req.sender_id,
        receiver = %req.receiver_id,
        multicast = %multicast_group,
        "Flow connected"
    );

    Ok(Json(ConnectResponse { connection_id, multicast_group, port }))
}

async fn disconnect_flow(
    State(state): State<SharedState>,
    axum::extract::Path(connection_id): axum::extract::Path<String>,
) -> StatusCode {
    let mut s = state.write().unwrap();
    if s.crosspoints.remove(&connection_id).is_some() {
        s.flows.remove(&connection_id);
        gauge!("nexus_router.connections.active", s.crosspoints.len() as f64);
        info!(connection_id = %connection_id, "Flow disconnected");
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

async fn get_stats(State(state): State<SharedState>) -> Json<RouterStats> {
    let s = state.read().unwrap();
    let total_bitrate: f64 = s.flows.values().map(|f| f.bitrate_mbps).sum::<f64>() / 1000.0;
    Json(RouterStats {
        active_flows: s.flows.len(),
        active_crosspoints: s.crosspoints.len(),
        total_bitrate_gbps: total_bitrate,
        ptp_locked: s.ptp_locked,
        ptp_offset_ns: s.ptp_offset_ns,
    })
}

// ── PTP simulation ────────────────────────────────────────────────────────────

async fn ptp_sync_task(state: SharedState) {
    let mut interval = tokio::time::interval(Duration::from_secs(1));
    loop {
        interval.tick().await;
        let mut s = state.write().unwrap();
        // Simulate PTP offset (4-12ns typical)
        s.ptp_offset_ns = 4 + (rand_offset() % 8);
        s.ptp_locked = true;
        gauge!("nexus_router.ptp.offset_ns", s.ptp_offset_ns as f64);
    }
}

fn rand_offset() -> i64 {
    // Simple pseudo-random for simulation
    use std::time::{SystemTime, UNIX_EPOCH};
    (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().subsec_nanos() % 100) as i64
}

// ── Main ──────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(std::env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string()))
        .init();

    // Prometheus metrics
    PrometheusBuilder::new()
        .with_http_listener("0.0.0.0:9090".parse::<SocketAddr>()?)
        .install()?;

    let state: SharedState = Arc::new(RwLock::new(RouterState::default()));

    // Start PTP sync simulation
    tokio::spawn(ptp_sync_task(state.clone()));

    let app = Router::new()
        .route("/health",              get(health))
        .route("/flows",               get(get_flows))
        .route("/flows/connect",       post(connect_flow))
        .route("/flows/:id/disconnect", post(disconnect_flow))
        .route("/stats",               get(get_stats))
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8090".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse()?;

    info!("ST 2110 Router listening on {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .with_graceful_shutdown(async {
            signal::ctrl_c().await.ok();
            info!("Router shutting down");
        })
        .await?;

    Ok(())
}
