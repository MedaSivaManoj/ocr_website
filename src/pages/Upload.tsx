import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Shield, Zap, Globe, PenTool } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { UploadZone } from '@/components/UploadZone';

const features = [
  {
    icon: Zap,
    title: 'Fast Processing',
    description: 'Advanced image preprocessing for quick text extraction',
  },
  {
    icon: PenTool,
    title: 'Handwriting Support',
    description: 'Enhanced recognition for handwritten notes and documents',
  },
  {
    icon: Shield,
    title: 'Local Processing',
    description: 'All OCR runs in your browser - no data leaves your device',
  },
  {
    icon: Globe,
    title: 'Multi-language',
    description: 'Support for 100+ languages with Tesseract OCR',
  },
];

export default function Upload() {
  const navigate = useNavigate();

  const handleComplete = () => {
    // Navigate to documents after processing
    setTimeout(() => navigate('/documents'), 1000);
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border bg-card/50">
          <h1 className="text-2xl font-bold text-foreground">Upload Documents</h1>
          <p className="text-muted-foreground">
            Upload images to extract text using OCR technology
          </p>
        </div>

        <div className="p-6 max-w-4xl mx-auto space-y-8">
          {/* Upload Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-elevated p-6"
          >
            <h2 className="font-semibold text-lg mb-4">Upload Images</h2>
            <UploadZone onComplete={handleComplete} />
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {features.map((feature) => (
              <div
                key={feature.title}
                className="card-elevated p-5 text-center"
              >
                <div className="inline-flex p-3 rounded-lg bg-primary/5 mb-3">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {feature.description}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Supported Formats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-elevated p-6"
          >
            <h2 className="font-semibold text-lg mb-4">Supported Formats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['PNG', 'JPG', 'JPEG', 'GIF', 'BMP', 'TIFF', 'WebP', 'PDF'].map(
              (format) => (
                <div
                  key={format}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted"
                >
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{format}</span>
                </div>
              )
            )}
          </div>
          </motion.div>

          {/* How It Works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-elevated p-6"
          >
            <h2 className="font-semibold text-lg mb-4">How It Works</h2>
            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: 'Upload Image',
                  description:
                    'Drag and drop or click to select your image files',
                },
                {
                  step: 2,
                  title: 'Image Preprocessing',
                  description:
                    'Grayscale, adaptive thresholding, deskewing, and noise removal for optimal recognition',
                },
                {
                  step: 3,
                  title: 'OCR Processing',
                  description:
                    'Tesseract OCR engine extracts text with high accuracy',
                },
                {
                  step: 4,
                  title: 'Export Results',
                  description:
                    'Download as plain text, searchable PDF, or Word document',
                },
              ].map((item, index) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  {index < 3 && (
                    <div className="absolute left-4 ml-[11px] h-8 w-0.5 bg-border" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
