import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'智库文章研读台',description:'私有文章分析与原文证据检索'};
export default function Layout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>}
