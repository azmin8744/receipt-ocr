gcloud beta functions deploy event\
    --runtime nodejs8\
    --project $GCP_PROJECT_ID\
    --trigger-event google.storage.object.finalize\
    --trigger-resource $GCS_BUCKET_NAME\
    --region $GCP_REGION

gcloud beta functions deploy CSVFile\
    --runtime nodejs8\
    --project $GCP_PROJECT_ID\
    --trigger-http\
    --region $GCP_REGION
