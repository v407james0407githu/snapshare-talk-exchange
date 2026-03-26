import { createContext, useContext, useEffect, useState, useCallback, memo } from "react";

interface AdminPageMeta {
  title: string;
  subtitle?: string;
}

interface AdminPageContextValue {
  meta: AdminPageMeta;
  setMeta: (meta: AdminPageMeta) => void;
}

const AdminPageContext = createContext<AdminPageContextValue>({
  meta: { title: "管理總覽" },
  setMeta: () => {},
});

export function AdminPageProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<AdminPageMeta>({ title: "管理總覽" });
  const stableSetMeta = useCallback((m: AdminPageMeta) => setMeta(m), []);

  return (
    <AdminPageContext.Provider value={{ meta, setMeta: stableSetMeta }}>
      {children}
    </AdminPageContext.Provider>
  );
}

/** Call in each admin page to set the header title/subtitle */
export function useAdminPage(title: string, subtitle?: string) {
  const { setMeta } = useContext(AdminPageContext);
  useEffect(() => {
    setMeta({ title, subtitle });
  }, [title, subtitle, setMeta]);
}

export function useAdminPageMeta() {
  return useContext(AdminPageContext).meta;
}
