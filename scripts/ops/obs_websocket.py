#!/usr/bin/env python3
import argparse
import base64
import hashlib
import json
import socket
import sys
import time
import uuid

from websocket import create_connection


def _auth_response(password: str, salt: str, challenge: str) -> str:
    secret = base64.b64encode(hashlib.sha256((password + salt).encode("utf-8")).digest()).decode("utf-8")
    return base64.b64encode(hashlib.sha256((secret + challenge).encode("utf-8")).digest()).decode("utf-8")


class ObsClient:
    def __init__(self, host: str, port: int, password: str | None = None):
        self.host = host
        self.port = port
        self.password = password or ""
        self.ws = None

    def connect(self) -> None:
        self.ws = create_connection(f"ws://{self.host}:{self.port}")
        hello = json.loads(self.ws.recv())
        if hello.get("op") != 0:
            raise RuntimeError(f"Unexpected OBS hello payload: {hello}")
        identify = {"rpcVersion": 1}
        auth = (hello.get("d") or {}).get("authentication")
        if auth:
            identify["authentication"] = _auth_response(
                self.password,
                auth["salt"],
                auth["challenge"],
            )
        self.ws.send(json.dumps({"op": 1, "d": identify}))
        identified = json.loads(self.ws.recv())
        if identified.get("op") != 2:
            raise RuntimeError(f"OBS identify failed: {identified}")

    def close(self) -> None:
        if self.ws is not None:
            self.ws.close()
            self.ws = None

    def request(self, request_type: str, request_data: dict | None = None) -> dict:
        if self.ws is None:
            raise RuntimeError("OBS websocket is not connected")
        request_id = str(uuid.uuid4())
        self.ws.send(
            json.dumps(
                {
                    "op": 6,
                    "d": {
                        "requestType": request_type,
                        "requestId": request_id,
                        "requestData": request_data or {},
                    },
                }
            )
        )
        while True:
            message = json.loads(self.ws.recv())
            if message.get("op") != 7:
                continue
            payload = message.get("d") or {}
            if payload.get("requestId") != request_id:
                continue
            status = payload.get("requestStatus") or {}
            if not status.get("result"):
                raise RuntimeError(f"{request_type} failed: {payload}")
            return payload.get("responseData") or {}


def wait_ready(host: str, port: int, timeout: float) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        s = socket.socket()
        s.settimeout(0.5)
        try:
            s.connect((host, port))
            s.close()
            print("ready")
            return
        except Exception:
            time.sleep(0.5)
        finally:
            try:
                s.close()
            except Exception:
                pass
    raise SystemExit(f"OBS websocket did not open on {host}:{port} within {timeout:.1f}s")


def ensure_demo_scene(client: ObsClient, scene_name: str, input_name: str) -> None:
    scenes = client.request("GetSceneList").get("scenes", [])
    scene_names = {scene.get("sceneName") for scene in scenes}
    if scene_name not in scene_names:
        client.request("CreateScene", {"sceneName": scene_name})

    input_kinds = client.request("GetInputKindList").get("inputKinds", [])
    preferred_kind = None
    for candidate in ("xshm_input_v2", "xshm_input", "pipewire-screen-capture-source"):
        if candidate in input_kinds:
            preferred_kind = candidate
            break
    if preferred_kind is None:
        raise RuntimeError(f"No supported Linux screen capture input kind found in {input_kinds}")

    existing_inputs = client.request("GetInputList").get("inputs", [])
    existing_names = {entry.get("inputName") for entry in existing_inputs}
    if input_name not in existing_names:
        input_settings = {"show_cursor": False}
        client.request(
            "CreateInput",
            {
                "sceneName": scene_name,
                "inputName": input_name,
                "inputKind": preferred_kind,
                "inputSettings": input_settings,
                "sceneItemEnabled": True,
            },
        )

    client.request("SetCurrentProgramScene", {"sceneName": scene_name})

    for source_name in ("Desktop Audio", "Mic/Aux"):
        try:
            client.request("SetInputMute", {"inputName": source_name, "inputMuted": True})
        except Exception:
            pass

    print(scene_name)


def start_record(client: ObsClient) -> None:
    client.request("StartRecord")
    print("recording")


def stop_record(client: ObsClient) -> None:
    response = client.request("StopRecord")
    print(response.get("outputPath", ""))


def main() -> int:
    parser = argparse.ArgumentParser(description="Minimal OBS websocket controller for demo recording")
    parser.add_argument("action", choices=["wait-ready", "ensure-demo-scene", "start-record", "stop-record"])
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4455)
    parser.add_argument("--password", default="")
    parser.add_argument("--timeout", type=float, default=20.0)
    parser.add_argument("--scene-name", default="RinaWarp Demo")
    parser.add_argument("--input-name", default="RinaWarp Display Capture")
    args = parser.parse_args()

    if args.action == "wait-ready":
        wait_ready(args.host, args.port, args.timeout)
        return 0

    client = ObsClient(args.host, args.port, args.password)
    client.connect()
    try:
        if args.action == "ensure-demo-scene":
            ensure_demo_scene(client, args.scene_name, args.input_name)
        elif args.action == "start-record":
            start_record(client)
        elif args.action == "stop-record":
            stop_record(client)
    finally:
        client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
