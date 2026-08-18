import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Corvo Roteiro",description:"Roteiro, cenas e produção com ChatGPT + MCP"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
