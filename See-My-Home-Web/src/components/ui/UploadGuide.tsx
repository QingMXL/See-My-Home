import { CircleHelp, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "../../i18n/LanguageContext";
import "./upload-guide.css";

type UploadKind = "layout" | "style" | "furniture";

const GUIDES = {
  layout: {
    en: {
      title: "Before you upload",
      tips: ["Use a flat, top-down plan", "Keep room labels readable", "JPG, PNG, or a clear PDF screenshot"],
    },
    zh: {
      title: "上传前检查",
      tips: ["使用平整、俯视的户型图", "确保房间文字清晰可读", "支持 JPG、PNG 或清晰的 PDF 截图"],
    },
  },
  style: {
    en: {
      title: "For a stronger style result",
      tips: ["Photograph the whole room", "Use bright, even lighting", "Keep the camera level and straight-on"],
    },
    zh: {
      title: "让风格效果更准确",
      tips: ["尽量拍到完整房间", "使用明亮、均匀的光线", "保持相机水平并正对空间"],
    },
  },
  furniture: {
    en: {
      title: "For a stronger furniture result",
      tips: ["Show one main furniture item", "Use a clear sketch or inspiration photo", "Describe materials and must-keep details"],
    },
    zh: {
      title: "让家具效果更准确",
      tips: ["画面中突出一件主要家具", "使用清晰的草图或灵感图", "写明材质和必须保留的细节"],
    },
  },
} as const;

export function UploadGuide({ kind, compact = false }: { kind: UploadKind; compact?: boolean }) {
  const { lang } = useI18n();
  const guide = GUIDES[kind][lang];
  const privacy = lang === "zh"
    ? "测试阶段请先移除人物、门牌、文件或其他敏感信息。上传内容将用于生成你请求的设计。"
    : "During beta, remove people, addresses, documents, or other sensitive details. Your upload is used to create the design you request.";

  return (
    <aside className={`upload-guide${compact ? " upload-guide--compact" : " card"}`} aria-labelledby={`upload-guide-${kind}`}>
      <div className="upload-guide__head">
        <CircleHelp size={20} aria-hidden="true" />
        <h3 id={`upload-guide-${kind}`}>{guide.title}</h3>
      </div>
      <ul>
        {guide.tips.map((tip) => <li key={tip}>{tip}</li>)}
      </ul>
      <div className="upload-guide__privacy">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>{privacy} <Link to="/help#privacy">{lang === "zh" ? "了解上传与隐私" : "Learn about uploads & privacy"} →</Link></p>
      </div>
    </aside>
  );
}
