// Template backend endpoint for macOS Session Replay
//
// This is a reference implementation for the server-side endpoint that generates
// GCS V4 signed URLs for chunk uploads. Adapt this to your own backend.
//
// Endpoint: POST /api/session-recording/get-upload-url
//
// Request:
//   Headers:
//     Authorization: Bearer <backend_secret>
//     X-Device-Id: <device_uuid>
//   Body (JSON):
//     {
//       "session_id": "abc-123",
//       "chunk_index": 0,
//       "start_timestamp": "2024-03-09T15:30:42Z",
//       "end_timestamp": "2024-03-09T15:31:42Z"
//     }
//
// Response (JSON):
//     {
//       "upload_url": "https://storage.googleapis.com/...",
//       "object_path": "<device_id>/<session_id>/chunk_0000.mp4"
//     }
//
// Dependencies (Cargo.toml):
//   axum = "0.7"
//   serde = { version = "1", features = ["derive"] }
//   chrono = "0.4"
//   sha2 = { version = "0.10", features = ["oid"] }
//   rsa = { version = "0.9", features = ["pem"] }
//   hex = "0.4"

use axum::{Extension, Json};
use chrono::Utc;
use sha2::Sha256;
use std::sync::Arc;

// --- Types ---

pub struct Config {
    pub gcs_bucket: String,          // e.g. "my-session-recordings"
    pub sa_private_key_pem: String,  // GCP service account RSA private key (PEM)
    pub sa_email: String,            // GCP service account email
}

pub struct AuthDevice {
    pub device_id: String,
}

#[derive(serde::Deserialize)]
pub struct GetUploadUrlRequest {
    pub session_id: String,
    pub chunk_index: u32,
    pub start_timestamp: String,
    pub end_timestamp: String,
}

#[derive(serde::Serialize)]
pub struct GetUploadUrlResponse {
    pub upload_url: String,
    pub object_path: String,
}

// --- Handler ---

pub async fn get_upload_url(
    Extension(config): Extension<Arc<Config>>,
    Extension(device): Extension<AuthDevice>,
    Json(body): Json<GetUploadUrlRequest>,
) -> Result<Json<GetUploadUrlResponse>, axum::http::StatusCode> {
    let bucket = &config.gcs_bucket;
    let object_path = format!(
        "{}/{}/chunk_{:04}.mp4",
        device.device_id, body.session_id, body.chunk_index
    );

    let signed_url = generate_v4_signed_url(
        &config.sa_private_key_pem,
        &config.sa_email,
        bucket,
        &object_path,
        "PUT",
        900, // 15 minutes
    )
    .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(GetUploadUrlResponse {
        upload_url: signed_url,
        object_path,
    }))
}

// --- GCS V4 Signed URL Generation ---

fn generate_v4_signed_url(
    sa_private_key_pem: &str,
    sa_email: &str,
    bucket: &str,
    object: &str,
    http_method: &str,
    expiration_secs: i64,
) -> Result<String, String> {
    let now = Utc::now();
    let datestamp = now.format("%Y%m%d").to_string();
    let datetime = now.format("%Y%m%dT%H%M%SZ").to_string();

    let credential_scope = format!("{}/auto/storage/goog4_request", datestamp);
    let credential = format!("{}/{}", sa_email, credential_scope);

    let host = "storage.googleapis.com";
    let resource = format!("/{}/{}", bucket, object);

    let mut query_params = vec![
        ("X-Goog-Algorithm", "GOOG4-RSA-SHA256".to_string()),
        ("X-Goog-Credential", credential.clone()),
        ("X-Goog-Date", datetime.clone()),
        ("X-Goog-Expires", expiration_secs.to_string()),
        ("X-Goog-SignedHeaders", "content-type;host".to_string()),
    ];
    query_params.sort_by(|a, b| a.0.cmp(&b.0));

    let canonical_query = query_params
        .iter()
        .map(|(k, v)| format!("{}={}", url_encode(k), url_encode(v)))
        .collect::<Vec<_>>()
        .join("&");

    let canonical_headers = format!("content-type:video/mp4\nhost:{}\n", host);
    let signed_headers = "content-type;host";

    let canonical_request = format!(
        "{}\n{}\n{}\n{}\n{}\nUNSIGNED-PAYLOAD",
        http_method, resource, canonical_query, canonical_headers, signed_headers
    );

    let canonical_request_hash = hex_sha256(canonical_request.as_bytes());
    let string_to_sign = format!(
        "GOOG4-RSA-SHA256\n{}\n{}\n{}",
        datetime, credential_scope, canonical_request_hash
    );

    let signature = rsa_sha256_sign(sa_private_key_pem, string_to_sign.as_bytes())?;
    let signature_hex = hex::encode(signature);

    Ok(format!(
        "https://{}/{}/{}?{}&X-Goog-Signature={}",
        host, bucket, object, canonical_query, signature_hex
    ))
}

fn hex_sha256(data: &[u8]) -> String {
    use sha2::Digest;
    let hash = Sha256::digest(data);
    hex::encode(hash)
}

fn rsa_sha256_sign(private_key_pem: &str, data: &[u8]) -> Result<Vec<u8>, String> {
    use rsa::pkcs1v15::SigningKey;
    use rsa::pkcs8::DecodePrivateKey;
    use rsa::signature::{SignatureEncoding, Signer};
    use rsa::RsaPrivateKey;

    let key = RsaPrivateKey::from_pkcs8_pem(private_key_pem)
        .map_err(|e| format!("RSA key: {}", e))?;
    let signing_key = SigningKey::<Sha256>::new(key);
    let signature = signing_key.sign(data);
    Ok(signature.to_vec())
}

fn url_encode(s: &str) -> String {
    let mut result = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(b as char);
            }
            _ => result.push_str(&format!("%{:02X}", b)),
        }
    }
    result
}
