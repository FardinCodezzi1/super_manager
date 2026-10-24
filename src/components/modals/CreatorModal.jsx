import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { Modal } from '../common/Modal';
import { configService } from '../../services/configService';

export function CreatorModal({ isOpen, onClose }) {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (isOpen) {
      configService.getAppConfig()
        .then((res) => setConfig(res?.config))
        .catch(() => null);
    }
  }, [isOpen]);

  const creatorName = config?.creatorName || 'Fardin Abu Ubaid';
  const creatorEmail = config?.creatorEmail || 'fardin1.codezzi@gmail.com';
  const creatorBio = config?.creatorBio || 'Full-Stack Developer & Creator of Mess Meal Manager & Tour Expense Platform.';
  const creatorPortfolio = config?.creatorPortfolio || 'https://portfolio-fardin.vercel.app';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="About the Creator"
      subtitle="Engineering and architecture"
      maxWidth="max-w-sm"
    >
      <div className="text-center space-y-2 py-2">
        <div className="w-14 h-14 sharp-xs theme-btn-primary mx-auto flex items-center justify-center text-lg font-extrabold shadow-md">
          FA
        </div>
        <h4 className="text-sm font-bold text-DynamicMain">{creatorName}</h4>
        <p className="text-xs text-DynamicMuted">{creatorEmail}</p>
        <p className="text-xs text-DynamicSec px-2 leading-relaxed">
          {creatorBio}
        </p>

        <div className="pt-2">
          <a
            href={creatorPortfolio}
            target="_blank"
            rel="noreferrer"
            className="tap-active inline-flex items-center gap-1.5 px-4 py-2 theme-btn-primary sharp-xs text-xs font-bold shadow-sm"
          >
            <span>Learn More About Me</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </Modal>
  );
}
