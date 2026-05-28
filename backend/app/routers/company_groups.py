from app.routers._master_factory import build_named_master_router

router = build_named_master_router(
    collection="company_groups", tag="company_groups", prefix="company-groups"
)
