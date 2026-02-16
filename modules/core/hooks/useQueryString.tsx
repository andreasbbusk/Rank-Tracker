import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useQueryString() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const createQueryString = useCallback(
    (name: string, value: string, currentQueryString?: string) => {
      const params = new URLSearchParams(
        currentQueryString || searchParams.toString(),
      );
      params.set(name, value);

      return params.toString();
    },
    [searchParams],
  );

  const deleteQueryString = useCallback(
    (name: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(name);
      return params.toString();
    },
    [searchParams],
  );

  return {
    pathname,
    searchParams,
    router,
    createQueryString,
    deleteQueryString,
  };
}
