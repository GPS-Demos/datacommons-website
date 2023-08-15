# Deployment
https://docs.datacommons.org/custom_dc/setup_gcp.html

## Build an image
- Authenticate with Argolis and GCP project: `gps-dataverse`
- Run the following:
```bash
export PROJECT=gps-dataverse
export SERVICE=datacommons-website
export TAG=latest
export IMAGE=gcr.io/$PROJECT/$SERVICE:$TAG

docker build -t $IMAGE -f build/web_server/Dockerfile .
docker push $IMAGE
```

## Deploy
- `git clone` the repo in a Cloud Shell instance in `gps-dataverse` project
- `cd` into the repo
- Run the following:
```bash
git pull origin
sudo wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/bin/yq
sudo chmod +x /usr/bin/yq

./scripts/deploy_gke_helm.sh -e gps_dataverse
```

### Deployment Config Changes
Any changes can be done in `./deploy/helm_charts/envs/gps_dataverse.yaml`


# Appendix
## Helm Chart
### Steps
```bash
git submodule foreach git pull origin master
git submodule update --init --recursive

TAG=$(git rev-parse --short=7 HEAD)
# TAG=$(git rev-parse --short=7 --remotes=upstream HEAD | head -n 1)

cd mixer
MIXER_TAG=$(git rev-parse --short=7 HEAD)
cd ..

helm upgrade --install \
  dc-website deploy/helm_charts/dc_website \
  --atomic \
  --debug \
  --timeout 10m \
  -f deploy/helm_charts/dc_website/instance-values.yaml \
  --set website.githash="$TAG" \
  --set mixer.githash="$MIXER_TAG" \
  --set-file mixer.schemaConfigs."base\.mcf"=mixer/deploy/mapping/base.mcf \
  --set-file mixer.schemaConfigs."encode\.mcf"=mixer/deploy/mapping/encode.mcf \
  --set-file kgStoreConfig.bigqueryVersion=mixer/deploy/storage/bigquery.version \
  --set-file kgStoreConfig.baseBigtableInfo=mixer/deploy/storage/base_bigtable_info.yaml
```
