import React from 'react';
import { motion } from 'framer-motion';

/**
 * Componente FeatureSection - Estilo SaaS Elite (Apple/Google)
 * Natalia Style 100%
 */
const FeatureSection = ({ title, description, bullets, media, reverse = false }) => {
  return (
    <section className={`feature-section-elite ${reverse ? 'reverse' : ''}`}>
      <div className="container-main feature-container-flex">
        
        {/* TEXTO COL */}
        <motion.div 
          className="feature-text-block"
          initial={{ opacity: 0, x: reverse ? 100 : -100 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} 
        >
          <h2 className="feat-title-elite">{title}</h2>
          <p className="feat-desc-elite">{description}</p>
          
          {bullets && (
            <ul className="feat-list-elite">
              {bullets.map((item, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                >
                  <span className="check-icon">✓</span> {item}
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* MEDIA COL */}
        <motion.div 
          className="feature-media-block"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.02, transition: { duration: 0.4 } }}
        >
          <div className="media-frame">
            {media.toLowerCase().endsWith('.mp4') ? (
              <video autoPlay muted loop playsInline className="media-asset">
                <source src={media} type="video/mp4" />
              </video>
            ) : (
              <img src={media} alt={title} className="media-asset" />
            )}
            <div className="media-glow"></div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default FeatureSection;
