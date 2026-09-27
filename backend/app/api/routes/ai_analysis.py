import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.project_service import ProjectService
from app.services.ai.service import AIAnalysisService
from app.services.ai.base import (
    BaseAIProvider,
    AIProviderConfigurationError,
    GeminiConfigurationError,
    GeminiRateLimitError,
    GeminiTimeoutError,
    GeminiServiceUnavailableError,
    OpenRouterConfigurationError,
    OpenRouterRateLimitError,
    OpenRouterTimeoutError,
    OpenRouterServiceUnavailableError,
    AIAnalysisGenerationError,
)
from app.services.ai.factory import get_configured_ai_provider
from app.services.analysis.citation_validator import CitationIntegrityError
from app.schemas.ai_analysis import (
    AIAnalysisResponse,
    AIAnalysisGenerationResponse,
    AIAnalysisSummaryItem,
)

router = APIRouter(prefix="/projects/{project_id}", tags=["ai_analysis"])


def _verify_project_exists(db: Session, project_id: uuid.UUID):
    """Verify that the project exists, else raise 404."""
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )
    return project


def get_ai_provider() -> BaseAIProvider:
    """Dependency provider for the AI reasoning client (overridable in tests)."""
    return get_configured_ai_provider()


@router.get(
    "/ai-analysis",
    response_model=AIAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Get project AI analysis (strictly read-only)",
)
def get_project_ai_analysis(
    project_id: uuid.UUID,
    snapshot_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Optional snapshot UUID to inspect AI analysis for",
    ),
    db: Session = Depends(get_db),
) -> AIAnalysisResponse:
    """Retrieve the latest persisted AI analysis without invoking external model calls."""
    _verify_project_exists(db, project_id)

    try:
        return AIAnalysisService.get_analysis(
            db=db,
            project_id=project_id,
            snapshot_id=snapshot_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve AI analysis: {str(e)}",
        )


@router.post(
    "/ai-analysis/generate",
    response_model=AIAnalysisGenerationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate or retrieve cached AI project evaluation",
)
def generate_project_ai_analysis(
    project_id: uuid.UUID,
    force: bool = Query(
        default=False,
        description="Whether to bypass cached analysis for the current evidence hash",
    ),
    snapshot_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Optional snapshot UUID to evaluate",
    ),
    db: Session = Depends(get_db),
    provider: BaseAIProvider = Depends(get_ai_provider),
) -> AIAnalysisGenerationResponse:
    """Explicitly trigger evidence-grounded AI evaluation over structured project facts."""
    _verify_project_exists(db, project_id)

    try:
        analysis_resp, was_cached = AIAnalysisService.generate_analysis(
            db=db,
            project_id=project_id,
            snapshot_id=snapshot_id,
            force=force,
            provider=provider,
        )
        msg = (
            "Retrieved cached AI analysis."
            if was_cached
            else "AI project evaluation generated successfully."
        )
        return AIAnalysisGenerationResponse(
            status="completed" if analysis_resp.status == "completed" else analysis_resp.status,
            message=msg,
            cached=was_cached,
            analysis=analysis_resp,
        )
    except (AIProviderConfigurationError, GeminiConfigurationError, OpenRouterConfigurationError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except (GeminiRateLimitError, OpenRouterRateLimitError) as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        )
    except (GeminiTimeoutError, OpenRouterTimeoutError) as e:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(e),
        )
    except (GeminiServiceUnavailableError, OpenRouterServiceUnavailableError) as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except CitationIntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI output rejected: {str(e)}",
        )
    except AIAnalysisGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generation failed: {str(e)}",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during AI evaluation: {str(e)}",
        )


@router.post(
    "/ai-analysis/retry",
    response_model=AIAnalysisGenerationResponse,
    status_code=status.HTTP_200_OK,
    summary="Retry AI project evaluation only",
)
def retry_project_ai_analysis(
    project_id: uuid.UUID,
    snapshot_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Optional snapshot UUID to retry AI evaluation for",
    ),
    db: Session = Depends(get_db),
    provider: BaseAIProvider = Depends(get_ai_provider),
) -> AIAnalysisGenerationResponse:
    """Explicitly retry only the AI deeper reasoning stage without re-running deterministic pipelines."""
    _verify_project_exists(db, project_id)

    try:
        analysis_resp, was_cached = AIAnalysisService.retry_analysis(
            db=db,
            project_id=project_id,
            snapshot_id=snapshot_id,
            provider=provider,
        )
        return AIAnalysisGenerationResponse(
            status="completed" if analysis_resp.status == "completed" else analysis_resp.status,
            message="AI project evaluation completed successfully via retry.",
            cached=was_cached,
            analysis=analysis_resp,
        )
    except (AIProviderConfigurationError, GeminiConfigurationError, OpenRouterConfigurationError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except (GeminiRateLimitError, OpenRouterRateLimitError) as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        )
    except (GeminiTimeoutError, OpenRouterTimeoutError) as e:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(e),
        )
    except (GeminiServiceUnavailableError, OpenRouterServiceUnavailableError) as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except CitationIntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI output rejected: {str(e)}",
        )
    except AIAnalysisGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generation failed: {str(e)}",
        )
    except ValueError as e:
        err_msg = str(e)
        if "already" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=err_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during AI evaluation retry: {str(e)}",
        )


@router.get(
    "/ai-analysis/history",
    response_model=List[AIAnalysisSummaryItem],
    status_code=status.HTTP_200_OK,
    summary="List past AI analysis runs for the project",
)
def list_ai_analysis_history(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> List[AIAnalysisSummaryItem]:
    """Return historical analysis runs for this project."""
    _verify_project_exists(db, project_id)
    return AIAnalysisService.list_history(db, project_id)


@router.get(
    "/ai-analysis/{analysis_id}",
    response_model=AIAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Get specific historical AI analysis run by ID",
)
def get_ai_analysis_by_id(
    project_id: uuid.UUID,
    analysis_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> AIAnalysisResponse:
    """Fetch a specific historical AI analysis with tenant isolation."""
    _verify_project_exists(db, project_id)

    try:
        return AIAnalysisService.get_analysis_by_id(
            db=db,
            project_id=project_id,
            analysis_id=analysis_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
