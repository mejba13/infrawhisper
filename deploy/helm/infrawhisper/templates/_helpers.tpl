{{/*
Expand the name of the chart.
*/}}
{{- define "infrawhisper.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "infrawhisper.labels" -}}
helm.sh/chart: {{ include "infrawhisper.name" . }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: infrawhisper
{{- end }}

{{/*
Image pull policy
*/}}
{{- define "infrawhisper.pullPolicy" -}}
{{ .Values.global.image.pullPolicy | default "IfNotPresent" }}
{{- end }}
