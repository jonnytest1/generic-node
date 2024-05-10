import { environment } from './app/environments/environment';


export function getBackendBaseUrl() {
  return environment.prefixPath || document.baseURI
}