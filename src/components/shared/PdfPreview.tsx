type PdfPreviewProps = {
  url: string;
  title: string;
  className?: string;
  loading?: "eager" | "lazy";
};

const getPdfPreviewUrl = (url: string) => {
  const hash = "page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0";
  return url.includes("#") ? `${url}&${hash}` : `${url}#${hash}`;
};

const PdfPreview = ({ url, title, className = "", loading = "lazy" }: PdfPreviewProps) => {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-white ${className}`}>
      <iframe
        src={getPdfPreviewUrl(url)}
        title={`${title} PDF preview`}
        loading={loading}
        className="pointer-events-none h-full w-full border-0 bg-white"
      />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
    </div>
  );
};

export default PdfPreview;

