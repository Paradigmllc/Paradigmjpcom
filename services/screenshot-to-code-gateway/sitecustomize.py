"""Runtime patch loaded by Python before the pinned upstream app starts."""

import os

if os.environ.get("DEEPSEEK_API_KEY"):
    os.environ.setdefault("OPENAI_API_KEY", os.environ["DEEPSEEK_API_KEY"])
    os.environ.setdefault("OPENAI_BASE_URL", os.environ.get("DEEPSEEK_API_BASE", "https://api.deepseek.com/v1"))

    import agent.engine as agent_engine
    import deepseek_provider

    agent_engine.create_provider_session = deepseek_provider.create_provider_session

    # Batch generation needs one variant. The upstream websocket contract and
    # agent loop remain unchanged; this only avoids four identical paid calls.
    import routes.generate_code as generate_code_route

    generate_code_route.NUM_VARIANTS = 1
    generate_code_route.NUM_VARIANTS_VIDEO = 1
