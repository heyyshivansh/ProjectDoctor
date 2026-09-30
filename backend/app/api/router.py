from fastapi import APIRouter
from app.api.routes import (
    health,
    projects,
    documents,
    understanding,
    requirements,
    repository,
    traceability,
    diagnosis,
    ai_analysis,
    analysis,
    improvement,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router, tags=["health"])
api_router.include_router(projects.router, tags=["projects"])
api_router.include_router(documents.router, tags=["documents"])
api_router.include_router(understanding.router, tags=["understanding"])
api_router.include_router(requirements.router, tags=["requirements"])
api_router.include_router(repository.router, tags=["repository"])
api_router.include_router(traceability.router, tags=["traceability"])
api_router.include_router(diagnosis.router, tags=["diagnosis"])
api_router.include_router(ai_analysis.router, tags=["ai_analysis"])
api_router.include_router(analysis.router, tags=["analysis"])
api_router.include_router(improvement.router, prefix="/projects", tags=["improvement"])



