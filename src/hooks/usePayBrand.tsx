import { useAppInfo } from "@/hooks/useAppInfo";

/**
 * Returns the dynamic Pay brand name based on the platform's configured app name.
 * e.g. "Dynime Pay", "Acme Pay", etc.
 */
export function usePayBrand() {
  const { appInfo } = useAppInfo();
  const appName = appInfo.app_name || "Dynime";
  const payBrand = `${appName} Pay`;

  return { payBrand, appName };
}
