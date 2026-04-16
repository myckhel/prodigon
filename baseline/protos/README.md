# gRPC Protocol Buffers

This directory contains the Protocol Buffer definitions for the platform's gRPC interfaces.

## Current State

The `inference.proto` file defines the gRPC service that mirrors the REST `/inference` endpoint. It is **scaffolded but not compiled** in the baseline — the full gRPC server implementation is built in **Task 1: REST vs gRPC**.

## How to Compile

```bash
pip install grpcio-tools

cd baseline/protos
python -m grpc_tools.protoc \
    -I. \
    --python_out=. \
    --grpc_python_out=. \
    inference.proto
```

This generates:
- `inference_pb2.py` — message classes
- `inference_pb2_grpc.py` — service stubs and server base classes

## Why gRPC?

gRPC uses HTTP/2 and binary serialization (protobuf), making it significantly faster than REST+JSON for internal service-to-service communication. See Task 1 for benchmarks and detailed comparison.
