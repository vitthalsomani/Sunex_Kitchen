from app.routers._master_factory import build_named_master_router

# Canteens are a simple named master (name/code/active). The 2 known canteens
# (Labour, Chinese) are seeded by the legacy importer.
router = build_named_master_router(collection="canteens", tag="canteens", prefix="canteens")
