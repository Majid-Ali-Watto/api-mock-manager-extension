export function isCollectionEffectivelyDisabled(collection, apis) {
  if (!collection) return false;
  
  // If collection is enabled, it's not disabled
  if (collection.enabled) return false;
  
  // If collection is disabled, check if all APIs are also disabled
  const apiList = apis || [];
  return apiList.every((api) => !api.enabled);
}

export function isApiEffectivelyDisabled(api, collection) {
  if (!collection) return !api.enabled;
  
  // API is effectively disabled only if both API and collection are disabled
  return !api.enabled && !collection.enabled;
}
