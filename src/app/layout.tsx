import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Script from "next/script";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "ExifLab - Advanced Image Metadata Tool",
  description: "A sophisticated web-based application for analyzing image metadata, converting formats, and exploring GPS data with an amazing UI.",
  keywords: ["EXIF", "metadata", "image", "privacy", "GPS", "converter", "analysis"],
  authors: [{ name: "ExifLab Team" }],
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
}

// In app/layout.tsx (App Router)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        {children}
        <Script
          dangerouslySetInnerHTML={{
            __html: `
              window.lightningjs||function(n){var e="lightningjs";function t(e,t){var r,i,a,o,d,c;return t&&(t+=(/\\?/.test(t)?"&":"?")+"lv=1"),n[e]||(r=window,i=document,a=e,o=i.location.protocol,d="load",c=0,function(){n[a]=function(){var t=arguments,i=this,o=++c,d=i&&i!=r&&i.id||0;function s(){return s.id=o,n[a].apply(s,arguments)}return(e.s=e.s||[]).push([o,d,t]),s.then=function(n,t,r){var i=e.fh[o]=e.fh[o]||[],a=e.eh[o]=e.eh[o]||[],d=e.ph[o]=e.ph[o]||[];return n&&i.push(n),t&&a.push(t),r&&d.push(r),s},s};var e=n[a]._={};function s(){e.P(d),e.w=1,n[a]("_load")}e.fh={},e.eh={},e.ph={},e.l=t?t.replace(/^\\/\\//,("https:"==o?o:"http:")+"//"):t,e.p={0:+new Date},e.P=function(n){e.p[n]=new Date-e.p[0]},e.w&&s(),r.addEventListener?r.addEventListener(d,s,!1):r.attachEvent("onload",s);var l=function(){function n(){return["<!DOCTYPE ",o,"><",o,"><head></head><",t,"><",r,' src="',e.l,'"></',r,"></",t,"></",o,">"].join("")}var t="body",r="script",o="html",d=i[t];if(!d)return setTimeout(l,100);e.P(1);var c,s=i.createElement("div"),h=s.appendChild(i.createElement("div")),u=i.createElement("iframe");s.style.display="none",d.insertBefore(s,d.firstChild).id="lightningjs-"+a,u.frameBorder="0",u.id="lightningjs-frame-"+a,/MSIE[ ]+6/.test(navigator.userAgent)&&(u.src="javascript:false"),u.allowTransparency="true",h.appendChild(u);try{u.contentWindow.document.open()}catch(n){e.domain=i.domain,c="javascript:var d=document.open();d.domain='"+i.domain+"';",u.src=c+"void(0);"}try{var p=u.contentWindow.document;p.write(n()),p.close()}catch(e){u.src=c+'d.write("'+n().replace(/"/g,String.fromCharCode(92)+'"')+'");d.close();'}e.P(2)};e.l&&l()}()),n[e].lv="1",n[e]}var r=window.lightningjs=t(e);r.require=t,r.modules=n}({});
              window.usabilla_live = lightningjs.require("usabilla_live", "//w.usabilla.com/f421c5330528.js");
            `,
          }}
        />
      </body>
    </html>
  )
}