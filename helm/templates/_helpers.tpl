{{/*
Expand the name of the chart.
*/}}
{{- define "genui-playground.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "genui-playground.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "genui-playground.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "genui-playground.labels" -}}
helm.sh/chart: {{ include "genui-playground.chart" . }}
{{ include "genui-playground.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "genui-playground.selectorLabels" -}}
app.kubernetes.io/name: {{ include "genui-playground.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "genui-playground.frontend.labels" -}}
{{ include "genui-playground.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "genui-playground.frontend.selectorLabels" -}}
{{ include "genui-playground.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Agent labels
*/}}
{{- define "genui-playground.agent.labels" -}}
{{ include "genui-playground.labels" . }}
app.kubernetes.io/component: agent
{{- end }}

{{/*
Agent selector labels
*/}}
{{- define "genui-playground.agent.selectorLabels" -}}
{{ include "genui-playground.selectorLabels" . }}
app.kubernetes.io/component: agent
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "genui-playground.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "genui-playground.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Frontend image name
*/}}
{{- define "genui-playground.frontend.image" -}}
{{- if .Values.global.imageRegistry }}
{{- printf "%s/%s:%s" .Values.global.imageRegistry .Values.frontend.image.repository (.Values.frontend.image.tag | default .Chart.AppVersion) }}
{{- else }}
{{- printf "%s:%s" .Values.frontend.image.repository (.Values.frontend.image.tag | default .Chart.AppVersion) }}
{{- end }}
{{- end }}

{{/*
Agent image name
*/}}
{{- define "genui-playground.agent.image" -}}
{{- if .Values.global.imageRegistry }}
{{- printf "%s/%s:%s" .Values.global.imageRegistry .Values.agent.image.repository (.Values.agent.image.tag | default .Chart.AppVersion) }}
{{- else }}
{{- printf "%s:%s" .Values.agent.image.repository (.Values.agent.image.tag | default .Chart.AppVersion) }}
{{- end }}
{{- end }}