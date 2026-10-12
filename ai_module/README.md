# EduPulse AI — Student Success, Risk & Placement Analytics

## 1. Project Overview

EduPulse AI is an AI/ML module designed to support student success analysis, academic risk identification, placement prediction, and student segmentation.

The module exposes REST API endpoints through FastAPI. It uses machine learning models to generate predictions from academic performance, learning engagement, and placement-related features.

### Key capabilities

- **Academic risk prediction:** Estimates the risk of failing or withdrawing.
- **Student success prediction:** Estimates the probability of passing or receiving a distinction.
- **Placement prediction:** Predicts whether a student is likely to be placed.
- **Student segmentation:** Groups students according to academic performance and engagement patterns.
- **Student analytics:** Combines available model outputs into a unified response.
- **Explainability:** Provides SHAP-based feature contributions and rule-based recommendations for academic risk.

## 2. Technology Stack

| Component | Technology |
|---|---|
| Programming language | Python 3.13.5 |
| API framework | FastAPI |
| API server | Uvicorn |
| Machine learning | AutoGluon Tabular |
| Data processing | Pandas, NumPy |
| Model evaluation | scikit-learn |
| Model explainability | SHAP |
| Model artifact loading | Joblib |
| Request validation | Pydantic |

### Main dependency versions

- AutoGluon Tabular: 1.6.3
- SHAP: 0.53.0
- FastAPI: 0.143.0
- Uvicorn: 0.54.0
- Pydantic: 2.14.0
- scikit-learn: 1.9.1

These are the versions observed in the development environment. The project’s dependency files should include the direct dependencies needed by the application.

## 3. Project Structure

The AI/ML module contains the API, prediction scripts, datasets, trained model artifacts, and evaluation outputs.

Important components include:

- `api.py` — FastAPI application and request validation.
- `predict_student.py` — Academic risk prediction and explanation logic.
- `placement_risk.py` — Placement prediction and risk classification.
- `data/raw/oulad/early_warning_dataset.csv` — Early-warning dataset used for academic modelling.
- `data/raw/placement/` — Placement dataset files.
- `outputs/automl_comparison/final_predictor/` — Academic risk model artifact.
- `outputs/binary_success_model/predictor/` — Binary student success model artifact.
- `outputs/placement_predictor/` — Placement model artifact.
- `outputs/student_segmentation/segmentation_pipeline.joblib` — Student segmentation pipeline.
- `outputs/student_segmentation/cluster_profiles.json` — Cluster profiles and descriptions.

The exact filenames of supporting scripts and generated outputs may vary with the current repository structure.

## 4. Setup and Installation

### Prerequisites

- Python 3.13.5
- PowerShell on Windows, or an equivalent terminal
- The project's trained model artifacts and required data files

### Step 1: Open the project directory

```powershell
cd E:\ByteXL\ai_module
```

### Step 2: Activate the virtual environment

If `.venv-automl` already exists:

```powershell
.\.venv-automl\Scripts\Activate.ps1
```

Otherwise, create a virtual environment:

```powershell
py -3.13 -m venv .venv-automl
.\.venv-automl\Scripts\Activate.ps1
```

### Step 3: Install dependencies

```powershell
python -m pip install -r requirements.txt
python -m pip install "autogluon.tabular==1.6.3" "shap==0.53.0"
```

The second command installs AutoGluon and SHAP if they are not already captured in `requirements.txt`.

### Step 4: Start the API

```powershell
python -m uvicorn api:app --reload
```

The development server should be available at:

- API base URL: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`
- OpenAPI schema: `http://127.0.0.1:8000/openapi.json`

Keep the terminal running while making API requests.

## 5. API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Returns basic API information. |
| GET | `/health` | Checks API health. |
| POST | `/predict` | Predicts academic risk. |
| POST | `/success-score` | Estimates student success probability. |
| POST | `/placement-risk` | Predicts placement outcome and placement risk. |
| POST | `/student-segmentation` | Assigns a student to a learned segment. |
| POST | `/student-analytics` | Combines available student analytics outputs. |

Open `/docs` to inspect the actual request schemas and response definitions exposed by the running API.

## 6. Academic Risk Prediction

The academic risk model uses early assessment and learning engagement data.

### Input features

- `early_assessment_count`
- `early_average_score`
- `early_lowest_score`
- `early_latest_submission_day`
- `early_total_clicks`
- `early_active_days`
- `early_active_sites`

### Example request

```json
{
  "early_assessment_count": 2,
  "early_average_score": 72,
  "early_lowest_score": 64,
  "early_latest_submission_day": 24,
  "early_total_clicks": 400,
  "early_active_days": 21,
  "early_active_sites": 146
}
```

Submit this payload to `POST /predict`.

### Target definition

The academic risk model treats Fail and Withdrawn as the risk-positive class, while Pass and Distinction form the other class.

### Held-out evaluation results

| Metric | Score |
|---|---:|
| Accuracy | 72.48% |
| Precision | 72.45% |
| Recall | 76.78% |
| F1-score | 74.55% |
| ROC-AUC | 80.03% |
| PR-AUC | 82.36% |

The metrics describe performance on the evaluation data and should not be interpreted as a guarantee of individual student outcomes.

### Risk interpretation

The current presentation thresholds are:

- High risk: risk probability ≥ 0.70
- Medium risk: risk probability ≥ 0.40 and < 0.70
- Low risk: risk probability < 0.40

These are configurable presentation thresholds, not independently validated or calibrated decision boundaries.

## 7. Student Success Prediction

The binary success model estimates the probability of the student belonging to the Pass/Distinction group.

### Evaluation results

| Metric | Score |
|---|---:|
| Accuracy | 72.94% |
| Precision | 70.57% |
| Recall | 73.80% |
| F1-score | 72.15% |
| ROC-AUC | 79.95% |

The reported evaluation used 26,122 training records and 6,471 test records.

The success probability is a model estimate based on the trained classifier. It is not a guarantee of academic success and should not be interpreted as a calibrated probability without further validation.

## 8. Placement Prediction

The placement model predicts the `PlacementStatus` outcome using placement-related student features.

### Input features

- `CGPA`
- `Internships`
- `Projects`
- `Workshops/Certifications`
- `AptitudeTestScore`
- `SoftSkillsRating`
- `ExtracurricularActivities`
- `PlacementTraining`
- `SSC_Marks`
- `HSC_Marks`

The request schema in `/docs` defines the exact field names, accepted values, and validation rules.

### Evaluation results

| Metric | Score |
|---|---:|
| Accuracy | 78.27% |
| Precision | 75.76% |
| Recall | 70.95% |
| F1-score | 73.28% |
| ROC-AUC | 86.52% |

Placement risk is presented using the predicted placement probability:

- Low risk: placement probability ≥ 0.70
- Medium risk: placement probability ≥ 0.40 and < 0.70
- High risk: placement probability < 0.40

These labels are derived from the model probability and configurable thresholds.

## 9. Student Segmentation

The segmentation component uses K-Means clustering to group students based on seven academic and engagement features.

### Methodology

1. Select the academic and engagement features.
2. Standardize the feature values.
3. Apply the trained K-Means pipeline.
4. Assign the student to a cluster.
5. Use the cluster profile to provide a descriptive segment label.

The selected configuration uses four clusters. Its reported silhouette score is 0.3541, calculated on a sample of up to 10,000 records during model selection.

### Current segment descriptions

| Cluster | Description |
|---|---|
| Cluster 0 | Higher assessment performance / Higher engagement |
| Cluster 1 | Higher assessment performance / Lower engagement |
| Cluster 2 | Lower assessment performance / Lower engagement |
| Cluster 3 | Lower assessment performance / Higher engagement |

These labels are relative descriptions of the observed cluster profiles. They are not formal student classifications, and the cluster assignment alone should not determine academic interventions.

## 10. Combined Student Analytics

`POST /student-analytics` combines the available outputs from academic risk, success prediction, placement prediction, and student segmentation.

It supports requests containing all relevant features or only a subset of the available information.

### Example request

```json
{
  "student_id": "STU001",
  "early_assessment_count": 2,
  "early_average_score": 72,
  "early_lowest_score": 64,
  "early_latest_submission_day": 24,
  "early_total_clicks": 400,
  "early_active_days": 21,
  "early_active_sites": 146,
  "CGPA": 8.2,
  "Internships": 2,
  "Projects": 3,
  "Workshops/Certifications": 4,
  "AptitudeTestScore": 78,
  "SoftSkillsRating": 4,
  "ExtracurricularActivities": "Yes",
  "PlacementTraining": "Yes",
  "SSC_Marks": 88,
  "HSC_Marks": 85
}
```

The request must follow the exact field types and accepted values shown in `/docs`.

### Expected capabilities

- Academic risk probability and risk label
- Student success probability and predicted outcome
- Placement probability, predicted placement outcome, and risk label
- Cluster assignment and segment description
- Explanation and recommendation information where available
- Data completeness and availability status

### Missing-data handling

The combined endpoint can return partial results when required information for one or more models is missing. Unavailable model outputs should remain unassessed rather than being represented as negative predictions.

The API also reports data coverage and distinguishes between missing inputs and validated predictions.

## 11. Explainability and Recommendations

The academic risk component uses SHAP KernelExplainer to calculate feature contributions.

The current explanation configuration uses a background sample of 20 records and 100 explanation samples.

Recommendations are generated using rules based on feature values and risk indicators. They are not causal conclusions and should be reviewed before being used to make student-level decisions.

## 12. Input Validation and Error Handling

Request validation is implemented using Pydantic and FastAPI.

Validation covers invalid score ranges, missing required inputs, incorrect data types, and invalid categorical values.

Examples of tested cases include:

- Missing `early_average_score` for `/predict`.
- A score of 120 when the allowed range is 0–100.
- An invalid `PlacementTraining` value such as `"Maybe"`.
- Incomplete academic information submitted to `/student-analytics`.
- Invalid academic features submitted to `/student-segmentation`, `/success-score`, and `/placement-risk`.

Invalid requests return HTTP 422 validation errors. Incomplete combined analytics requests can return partial results where the request itself is valid.

## 13. Testing

The following API-level checks have been performed:

- Successful requests to all seven endpoints.
- Academic risk and success prediction.
- Placement prediction.
- Student segmentation.
- Combined analytics with complete inputs.
- Combined analytics with incomplete inputs.
- Invalid score ranges and invalid categorical values.

These checks establish that the tested API paths operate in the local environment. They do not establish production readiness, frontend integration, database integration, or generalization to every student population.

## 14. Important Limitations

- Predictions depend on the training datasets and available input features.
- Model evaluation results are dataset-specific.
- Probability thresholds are configurable and should be validated before operational use.
- Cluster descriptions are relative to the trained dataset.
- SHAP contributions explain model behaviour, not causation.
- Rule-based recommendations should be reviewed by educators.
- Student data should be handled securely, with appropriate access controls and privacy safeguards.
- Frontend, backend infrastructure, and database integration must be tested separately before deployment.

## 15. Future Enhancements

- Integrate the AI endpoints with the frontend and backend services.
- Add authenticated access and role-based permissions.
- Store prediction history and intervention outcomes securely.
- Evaluate model calibration and fairness across student groups.
- Monitor prediction quality as new student data becomes available.
- Validate academic risk thresholds with educators.
- Evaluate whether recommendations improve student outcomes.

## 16. Project Status

The AI/ML module has trained model artifacts, a FastAPI prediction layer, validation rules, and local endpoint tests.

The module is ready for further integration testing with the remaining EduPulse AI components. Production deployment should follow additional security, privacy, model validation, and integration checks.
