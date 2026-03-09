# Execution Backend V2

## Purpose
Execution Backend abstracts runtime engines behind connector and capability metadata.

## Core fields
- connector_code
- integration_instance_id
- endpoint_url
- config_json
- capabilities_json
- status
- last_seen_at

## Responsibilities
- Provide dispatch target for worker execution.
- Maintain runtime endpoint health/capabilities metadata.
- Normalize provider-specific execution APIs through adapters.
