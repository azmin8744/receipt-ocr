gcloud beta functions deploy event\
    --runtime nodejs8\
    --project $GCP_PROJECT_ID\
    --trigger-event google.storage.object.finalize\
    --trigger-resource $GCS_BUCKET_NAME\
    --region $GCP_REGION
