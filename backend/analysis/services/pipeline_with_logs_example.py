"""
pipeline_with_logs.py - EXAMPLE
Shows how to integrate log emission into the existing pipeline.

This is a REFERENCE IMPLEMENTATION. Copy the emit_log patterns
into your existing pipeline.py file.

Key patterns:
1. Import emit_log from config.consumers
2. Call emit_log(analysis_id, message, level) after each pipeline step
3. Use async_to_sync wrapper in sync contexts
"""

# ──────────────────────────────────────────────────────────────────────────
# IMPORTS (add these to existing pipeline.py)
# ──────────────────────────────────────────────────────────────────────────

from asgiref.sync import async_to_sync
from config.consumers import emit_log


# ──────────────────────────────────────────────────────────────────────────
# HELPER FUNCTION (add to pipeline.py)
# ──────────────────────────────────────────────────────────────────────────

def _emit_log_sync(analysis_id: str, message: str, level: str = "info"):
    """
    Emit a log message in a synchronous context.
    Wraps the async emit_log function for use in sync Django views.
    """
    try:
        async_to_sync(emit_log)(analysis_id, message, level)
    except Exception as e:
        # If log emission fails, log to Django logger but don't crash the pipeline
        logger.error(f"Failed to emit log: {e}")


# ──────────────────────────────────────────────────────────────────────────
# EXAMPLE: Updated run_pipeline function with log emission
# ──────────────────────────────────────────────────────────────────────────

def run_pipeline_with_logs(
    analysis_id: str,
    input_type: str,
    input_value: str,
    use_ollama: bool = True,
):
    """
    Example: run_pipeline with integrated log emission.
    
    Replace calls to run_pipeline() with this to get log output.
    Or integrate these _emit_log_sync() calls into your existing run_pipeline().
    """

    ctx: dict = {}

    try:
        # ──────────────────────────────────────────────────────────────────
        # Step 0: Log start
        # ──────────────────────────────────────────────────────────────────
        _emit_log_sync(analysis_id, "✓ Analysis started", "info")
        _emit_log_sync(analysis_id, f"Input type: {input_type}, Length: {len(input_value)}", "debug")

        # ──────────────────────────────────────────────────────────────────
        # Step 0.5: Extract article from URL if needed
        # ──────────────────────────────────────────────────────────────────
        if input_type == "url":
            _emit_log_sync(analysis_id, "→ Extracting article from URL...", "info")
            try:
                article_data = extract_article(input_value)
                if article_data and article_data.get("content"):
                    input_value = article_data["content"]
                    _emit_log_sync(
                        analysis_id,
                        f"✓ Article extracted ({len(input_value)} chars)",
                        "success",
                    )
                else:
                    _emit_log_sync(analysis_id, "⚠ No content found in URL", "warning")
            except Exception as e:
                _emit_log_sync(analysis_id, f"✗ URL extraction failed: {str(e)}", "error")
                ctx["extraction_error"] = str(e)

        # ──────────────────────────────────────────────────────────────────
        # Step 1: Validation
        # ──────────────────────────────────────────────────────────────────
        _emit_log_sync(analysis_id, "→ Validating input...", "info")
        try:
            _validate_input(input_type, input_value)
            _emit_log_sync(analysis_id, "✓ Input validation passed", "success")
        except PipelineError as e:
            _emit_log_sync(analysis_id, f"✗ Validation failed: {e.detail}", "error")
            raise

        # ──────────────────────────────────────────────────────────────────
        # Step 2: Preprocessing
        # ──────────────────────────────────────────────────────────────────
        _emit_log_sync(analysis_id, "→ Preprocessing text...", "info")
        try:
            preprocessed = preprocess(input_value)
            ctx["preprocessed_text"] = preprocessed
            _emit_log_sync(
                analysis_id,
                f"✓ Text preprocessing complete ({len(preprocessed)} chars)",
                "success",
            )
        except PipelineError as e:
            _emit_log_sync(analysis_id, f"✗ Preprocessing failed: {e.detail}", "error")
            raise

        # ──────────────────────────────────────────────────────────────────
        # Step 2.5: Source Verification
        # ──────────────────────────────────────────────────────────────────
        _emit_log_sync(analysis_id, "→ Verifying sources...", "info")
        try:
            sources_result = verify_sources(input_value, input_type=input_type)
            ctx.update(sources_result)
            trusted_count = sources_result.get("trusted_match_count", 0)
            _emit_log_sync(
                analysis_id,
                f"✓ Source verification complete ({trusted_count} trusted matches)",
                "success",
            )
        except Exception as e:
            _emit_log_sync(analysis_id, f"⚠ Source verification warning: {str(e)}", "warning")
            ctx["sources"] = []
            ctx["trusted_match_count"] = 0

        # ──────────────────────────────────────────────────────────────────
        # Step 3: Feature Extraction
        # ──────────────────────────────────────────────────────────────────
        _emit_log_sync(analysis_id, "→ Extracting features & claims...", "info")
        try:
            features = extract_features(preprocessed)
            ctx["features"] = features
            claim_count = len(features.get("claims", []))
            _emit_log_sync(
                analysis_id,
                f"✓ Feature extraction complete ({claim_count} claims detected)",
                "success",
            )
        except PipelineError as e:
            _emit_log_sync(analysis_id, f"✗ Feature extraction failed: {e.detail}", "error")
            raise

        # ──────────────────────────────────────────────────────────────────
        # Step 4: Scoring
        # ──────────────────────────────────────────────────────────────────
        _emit_log_sync(analysis_id, "→ Computing credibility score...", "info")
        try:
            score = compute_score(ctx)
            verdict = _score_to_verdict(score)
            ctx["score"] = score
            ctx["verdict"] = verdict
            _emit_log_sync(
                analysis_id,
                f"✓ Credibility score computed: {score} ({verdict})",
                "success",
            )
        except PipelineError as e:
            _emit_log_sync(analysis_id, f"✗ Scoring failed: {e.detail}", "error")
            raise

        # ──────────────────────────────────────────────────────────────────
        # Step 5: Report Building
        # ──────────────────────────────────────────────────────────────────
        _emit_log_sync(analysis_id, "→ Building verification report...", "info")
        try:
            report = build_report(ctx)
            ctx["report"] = report
            _emit_log_sync(
                analysis_id,
                "✓ Verification report generated",
                "success",
            )
        except PipelineError as e:
            _emit_log_sync(analysis_id, f"✗ Report building failed: {e.detail}", "error")
            raise

        # ──────────────────────────────────────────────────────────────────
        # Step 6: LLM Explanation (Optional)
        # ──────────────────────────────────────────────────────────────────
        if use_ollama:
            _emit_log_sync(analysis_id, "→ Generating AI explanation...", "info")
            try:
                llm_result = call_ollama_for_explanation(ctx)
                ctx["llm_result"] = llm_result
                ctx["llm_status"] = llm_result.get("status", "unknown")

                if llm_result.get("status") == "success":
                    _emit_log_sync(
                        analysis_id,
                        "✓ AI explanation generated",
                        "success",
                    )
                else:
                    _emit_log_sync(
                        analysis_id,
                        f"⚠ LLM warning: {llm_result.get('error', 'Unknown error')}",
                        "warning",
                    )
            except Exception as e:
                _emit_log_sync(analysis_id, f"⚠ LLM exception: {str(e)}", "warning")
                ctx["llm_status"] = "error"
                ctx["llm_error"] = str(e)
        else:
            _emit_log_sync(analysis_id, "⊝ Skipping LLM (Ollama disabled)", "debug")

        # ──────────────────────────────────────────────────────────────────
        # Complete
        # ──────────────────────────────────────────────────────────────────
        _emit_log_sync(analysis_id, "✓ Analysis complete!", "success")
        return ctx

    except Exception as e:
        _emit_log_sync(
            analysis_id,
            f"✗ PIPELINE ERROR: {str(e)}",
            "error",
        )
        raise


# ──────────────────────────────────────────────────────────────────────────
# INTEGRATION CHECKLIST
# ──────────────────────────────────────────────────────────────────────────

"""
To integrate log emission into your existing pipeline.py:

1. Add imports at the top:
   from asgiref.sync import async_to_sync
   from config.consumers import emit_log

2. Add the _emit_log_sync() helper function

3. Update run_pipeline() function to call _emit_log_sync() after each major step:
   - After input validation
   - After preprocessing
   - After source verification
   - After feature extraction
   - After scoring (include the score)
   - After report building
   - After LLM call (if enabled)

4. Pass analysis_id through the pipeline:
   - Update run_pipeline() signature to include analysis_id parameter
   - This should be passed from submit_analysis() view

5. Check that Django Channels is properly configured (see SETUP_GUIDE.md)

6. Test by:
   - Running backend with: python manage.py runserver
   - Opening frontend analysis
   - Checking browser console for WebSocket logs
   - Verifying log messages appear in LogPanel component
"""
