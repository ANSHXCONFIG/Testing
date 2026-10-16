from fastapi import FastAPI, HTTPException, Query
import requests
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import urllib3

# Disable SSL warnings for Free Fire endpoint
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = FastAPI(title="Free Fire Like API", version="1.0")

# ==================== CONSTANTS ====================
RishuxLiKe = "https://client.ind.freefiremobile.com/LikeProfile"

KEY = bytes([89, 103, 38, 116, 99, 37, 68, 69, 117, 104, 54, 37, 90, 99, 94, 56])
IV  = bytes([54, 111, 121, 90, 68, 114, 50, 50, 69, 51, 121, 99, 104, 106, 77, 37])

HEADERS = {
    "User-Agent": "UnityPlayer/2022.3.47f1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)",
    "X-GA": "v1 1",
    "ReleaseVersion": "OB55",
    "Content-Type": "application/octet-stream",
    "X-Unity-Version": "2022.3.47f1"
}

# ==================== PROTOBUF BUILDER ====================
def encode_varint(value: int) -> bytes:
    result = []
    while value > 127:
        result.append((value & 0x7F) | 0x80)
        value >>= 7
    result.append(value)
    return bytes(result)

def build_like_protobuf(account_id: int) -> bytes:
    data = bytearray()
    
    data.extend(encode_varint(8))
    data.extend(encode_varint(account_id))
    
    submsg = bytearray()
    submsg.extend(encode_varint(80))   
    submsg.extend(encode_varint(75))  
    
    data.extend(encode_varint(18))
    data.extend(encode_varint(len(submsg)))
    data.extend(submsg)
    
    return bytes(data)

def encrypt_data(data: bytes) -> bytes:
    cipher = AES.new(KEY, AES.MODE_CBC, IV)
    return cipher.encrypt(pad(data, AES.block_size))

# ==================== API ENDPOINT ====================
@app.get("/api/like")
def send_like(
    jwt: str = Query(..., description="Your JWT Auth Token"), 
    uid: int = Query(..., description="Target Account ID")
):
    try:
        # Build protobuf & encrypt
        plain = build_like_protobuf(uid)
        encrypted = encrypt_data(plain)
        
        headers = HEADERS.copy()
        headers["Authorization"] = f"Bearer {jwt}"
        
        # Send request to Free Fire server
        resp = requests.post(RishuxLiKe, headers=headers, data=encrypted, timeout=15, verify=False)
        
        return {
            "status_code": resp.status_code,
            "success": resp.status_code == 200,
            "account_id": uid,
            "response_hex": resp.content.hex().upper(),
            "message": "Like sent successfully!" if resp.status_code == 200 else "Server returned error."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
