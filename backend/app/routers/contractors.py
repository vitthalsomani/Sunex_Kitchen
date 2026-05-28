from app.routers._master_factory import build_named_master_router

router = build_named_master_router(
    collection="contractors", tag="contractors", prefix="contractors"
)
