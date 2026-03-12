use serde::{Deserialize, Serialize};

/// A quantity string from the Kubernetes API, e.g. "125m" (125 millicores) or "256Mi"
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Quantity(pub String);

impl Quantity {
    /// Parse CPU quantity to millicores.
    /// "125m" → 125, "1" → 1000, "0.5" → 500
    pub fn to_millicores(&self) -> f64 {
        let s = &self.0;
        if let Some(stripped) = s.strip_suffix('m') {
            stripped.parse::<f64>().unwrap_or(0.0)
        } else {
            s.parse::<f64>().unwrap_or(0.0) * 1000.0
        }
    }

    /// Parse memory quantity to bytes.
    pub fn to_bytes(&self) -> f64 {
        let s = &self.0;
        let (num, suffix) = if s.ends_with("Ki") {
            (&s[..s.len()-2], 1024.0_f64)
        } else if s.ends_with("Mi") {
            (&s[..s.len()-2], 1024.0 * 1024.0)
        } else if s.ends_with("Gi") {
            (&s[..s.len()-2], 1024.0 * 1024.0 * 1024.0)
        } else if s.ends_with('k') || s.ends_with('K') {
            (&s[..s.len()-1], 1000.0)
        } else if s.ends_with('M') {
            (&s[..s.len()-1], 1_000_000.0)
        } else if s.ends_with('G') {
            (&s[..s.len()-1], 1_000_000_000.0)
        } else {
            (s.as_str(), 1.0)
        };
        num.parse::<f64>().unwrap_or(0.0) * suffix
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ContainerMetrics {
    pub name: String,
    pub usage: ContainerUsage,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ContainerUsage {
    pub cpu: Quantity,
    pub memory: Quantity,
}

/// PodMetrics from metrics.k8s.io/v1beta1
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PodMetrics {
    pub metadata: kube::core::ObjectMeta,
    pub timestamp: String,
    pub window: String,
    pub containers: Vec<ContainerMetrics>,
}

impl kube::Resource for PodMetrics {
    type DynamicType = ();
    type Scope = kube::core::NamespaceResourceScope;

    fn group(_: &()) -> std::borrow::Cow<'_, str> { "metrics.k8s.io".into() }
    fn version(_: &()) -> std::borrow::Cow<'_, str> { "v1beta1".into() }
    fn kind(_: &()) -> std::borrow::Cow<'_, str> { "PodMetrics".into() }
    fn plural(_: &()) -> std::borrow::Cow<'_, str> { "pods".into() }
    fn meta(&self) -> &kube::core::ObjectMeta { &self.metadata }
    fn meta_mut(&mut self) -> &mut kube::core::ObjectMeta { &mut self.metadata }
}

/// NodeMetrics from metrics.k8s.io/v1beta1
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeMetrics {
    pub metadata: kube::core::ObjectMeta,
    pub timestamp: String,
    pub window: String,
    pub usage: ContainerUsage,
}

impl kube::Resource for NodeMetrics {
    type DynamicType = ();
    type Scope = kube::core::ClusterResourceScope;

    fn group(_: &()) -> std::borrow::Cow<'_, str> { "metrics.k8s.io".into() }
    fn version(_: &()) -> std::borrow::Cow<'_, str> { "v1beta1".into() }
    fn kind(_: &()) -> std::borrow::Cow<'_, str> { "NodeMetrics".into() }
    fn plural(_: &()) -> std::borrow::Cow<'_, str> { "nodes".into() }
    fn meta(&self) -> &kube::core::ObjectMeta { &self.metadata }
    fn meta_mut(&mut self) -> &mut kube::core::ObjectMeta { &mut self.metadata }
}
