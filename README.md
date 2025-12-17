# Omaha System Clinical Documentation App

A GDPR-compliant web application for documenting patient care using the standardized **Omaha System**.

This project provides a digital workflow for the entire cycle of care: **Assessment** (Problems & Symptoms), **Intervention** (Care Pathways), and **Evaluation** (Outcome Scoring).

## Key Features

* **Standardized Taxonomy:** Full implementation of the Omaha System (4 Domains, 42 Problems, 75 Targets).
* **Longitudinal Tracking:** Visualize patient progress over time using the Problem Rating Scale for Outcomes (K-B-S Ratings 1-5).
* **GDPR Compliant:**
    * **Encryption at Rest:** PII (Names, Addresses) is encrypted in the database using Fernet (AES).
    * **Strict Access Control:** Anonymized IDs used for clinical data; sensitive data stored separately.
    * **Consent Management:** Granular consent tracking (e.g., Data Processing vs. Research).
* **Data Export:** Generates clinical summaries for external systems (e.g., Group Office) or plain text reports.

## Tech Stack

* **Backend:** Python (FastAPI), SQLAlchemy, Pydantic.
* **Database:** SQLite (Relational Schema).
* **Frontend:** React.

## Attribution and Legal

### The Omaha System

This application implements the **Omaha System**, a standardized taxonomy for health care.

> The Omaha System is in the public domain. It is not copyrighted. Permission is not required to use it.

For more information, visit [omahasystem.org](https://www.omahasystem.org/).

### Disclaimer

This software is provided for documentation and educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
