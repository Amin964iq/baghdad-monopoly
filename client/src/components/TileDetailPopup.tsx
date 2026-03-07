import type { Player } from '../App';
import type { TileData } from '../gameData';
import { GROUP_COLORS, formatMoney, LUCKY_CHEST_CARDS, LUCK_CARDS } from '../gameData';

interface Props {
  tile: TileData;
  owner?: Player;
  ownerColor?: string;
  houses: number;
  onClose: () => void;
}

// Rent data matching server gameData.ts
const RENT_DATA: Record<number, { baseRent: number; rent1: number; rent2: number; rent3: number; rent4: number; hotel: number; houseCost: number }> = {
  1: { baseRent: 2000, rent1: 10000, rent2: 30000, rent3: 90000, rent4: 160000, hotel: 250000, houseCost: 50000 },
  3: { baseRent: 4000, rent1: 20000, rent2: 60000, rent3: 180000, rent4: 320000, hotel: 450000, houseCost: 50000 },
  6: { baseRent: 8000, rent1: 40000, rent2: 100000, rent3: 300000, rent4: 450000, hotel: 600000, houseCost: 50000 },
  7: { baseRent: 10000, rent1: 50000, rent2: 150000, rent3: 450000, rent4: 625000, hotel: 750000, houseCost: 100000 },
  9: { baseRent: 12000, rent1: 60000, rent2: 180000, rent3: 500000, rent4: 700000, hotel: 900000, houseCost: 100000 },
  11: { baseRent: 18000, rent1: 90000, rent2: 250000, rent3: 700000, rent4: 875000, hotel: 1050000, houseCost: 150000 },
  12: { baseRent: 18000, rent1: 90000, rent2: 250000, rent3: 700000, rent4: 875000, hotel: 1050000, houseCost: 150000 },
  14: { baseRent: 22000, rent1: 110000, rent2: 330000, rent3: 800000, rent4: 975000, hotel: 1150000, houseCost: 150000 },
  16: { baseRent: 26000, rent1: 130000, rent2: 390000, rent3: 900000, rent4: 1100000, hotel: 1275000, houseCost: 200000 },
  18: { baseRent: 28000, rent1: 150000, rent2: 450000, rent3: 1000000, rent4: 1200000, hotel: 1400000, houseCost: 200000 },
  19: { baseRent: 30000, rent1: 160000, rent2: 470000, rent3: 1050000, rent4: 1250000, hotel: 1500000, houseCost: 200000 },
  21: { baseRent: 35000, rent1: 175000, rent2: 500000, rent3: 1100000, rent4: 1300000, hotel: 1500000, houseCost: 200000 },
  23: { baseRent: 38000, rent1: 185000, rent2: 550000, rent3: 1200000, rent4: 1400000, hotel: 1700000, houseCost: 200000 },
  24: { baseRent: 40000, rent1: 200000, rent2: 600000, rent3: 1400000, rent4: 1700000, hotel: 2000000, houseCost: 200000 },
  26: { baseRent: 44000, rent1: 220000, rent2: 660000, rent3: 1500000, rent4: 1850000, hotel: 2200000, houseCost: 250000 },
  27: { baseRent: 48000, rent1: 240000, rent2: 720000, rent3: 1600000, rent4: 2000000, hotel: 2400000, houseCost: 250000 },
  29: { baseRent: 50000, rent1: 260000, rent2: 780000, rent3: 1800000, rent4: 2200000, hotel: 2600000, houseCost: 250000 },
  31: { baseRent: 55000, rent1: 300000, rent2: 900000, rent3: 2000000, rent4: 2400000, hotel: 2800000, houseCost: 300000 },
  32: { baseRent: 58000, rent1: 320000, rent2: 960000, rent3: 2100000, rent4: 2550000, hotel: 3000000, houseCost: 300000 },
  34: { baseRent: 62000, rent1: 350000, rent2: 1050000, rent3: 2300000, rent4: 2800000, hotel: 3200000, houseCost: 300000 },
  37: { baseRent: 75000, rent1: 400000, rent2: 1200000, rent3: 2800000, rent4: 3400000, hotel: 4000000, houseCost: 400000 },
  39: { baseRent: 90000, rent1: 500000, rent2: 1500000, rent3: 3500000, rent4: 4500000, hotel: 5000000, houseCost: 400000 },
};

const TILE_TYPE_LABELS: Record<string, string> = {
  go: 'انطلاق - اجمع 200K عند المرور',
  property: 'عقار',
  station: 'محطة',
  utility: 'خدمات',
  special_property: 'عقار خاص',
  tax: 'ضريبة - ادفع 10% أو 200K',
  bank_tax: 'ضريبة البنك - ادفع 100K',
  lucky_chest: 'صندوق اللعبة - اسحب بطاقة',
  luck_card: 'حظك - اسحب بطاقة',
  jail: 'السجن / زيارة',
  go_to_jail: 'روح للسجن!',
  collect_pot: 'اجمع الصندوق',
  switch_position: 'تبديل موقع - ادفع 120K',
};

export default function TileDetailPopup({ tile, owner, ownerColor, houses, onClose }: Props) {
  const groupColor = tile.group ? GROUP_COLORS[tile.group] : undefined;
  const rentData = RENT_DATA[tile.id];
  const isProperty = ['property', 'station', 'utility', 'special_property'].includes(tile.type);
  const sellPrice = tile.price ? Math.floor(tile.price / 2) : 0;

  return (
    <div className="tile-detail-overlay" onClick={onClose}>
      <div className="tile-detail-card" onClick={e => e.stopPropagation()}>
        {/* Header with color */}
        {groupColor && <div className="tile-detail-color" style={{ background: groupColor }} />}

        <div className="tile-detail-header">
          <div className="tile-detail-name">{tile.name}</div>
          <div className="tile-detail-name-en">{tile.nameEn}</div>
          <div className="tile-detail-type">{TILE_TYPE_LABELS[tile.type] || tile.type}</div>
        </div>

        {/* Owner info */}
        {owner && ownerColor && (
          <div className="tile-detail-owner" style={{ borderColor: ownerColor }}>
            <span className="owner-dot" style={{ background: ownerColor }} />
            ملك: {owner.name}
            {houses > 0 && houses < 5 && <span> | {'🏠'.repeat(houses)}</span>}
            {houses === 5 && <span> | 🏨 فندق</span>}
          </div>
        )}

        {/* Price */}
        {tile.price && (
          <div className="tile-detail-section">
            <div className="detail-row">
              <span>💰 سعر الشراء:</span>
              <span className="detail-value">{formatMoney(tile.price)} د.ع</span>
            </div>
            {sellPrice > 0 && (
              <div className="detail-row">
                <span>🏷️ سعر البيع:</span>
                <span className="detail-value dim">{formatMoney(sellPrice)} د.ع</span>
              </div>
            )}
          </div>
        )}

        {/* Rent table for properties */}
        {rentData && (
          <div className="tile-detail-section">
            <div className="detail-subtitle">📊 جدول الإيجار</div>
            <div className={`detail-row ${houses === 0 && owner ? 'rent-active' : ''}`}>
              <span>بدون بيوت:</span>
              <span className="detail-value">{formatMoney(rentData.baseRent)}</span>
            </div>
            <div className={`detail-row ${houses === 1 ? 'rent-active' : ''}`}>
              <span>🏠 بيت واحد:</span>
              <span className="detail-value">{formatMoney(rentData.rent1)}</span>
            </div>
            <div className={`detail-row ${houses === 2 ? 'rent-active' : ''}`}>
              <span>🏠🏠 بيتين:</span>
              <span className="detail-value">{formatMoney(rentData.rent2)}</span>
            </div>
            <div className={`detail-row ${houses === 3 ? 'rent-active' : ''}`}>
              <span>🏠🏠🏠 ثلاثة:</span>
              <span className="detail-value">{formatMoney(rentData.rent3)}</span>
            </div>
            <div className={`detail-row ${houses === 4 ? 'rent-active' : ''}`}>
              <span>🏠🏠🏠🏠 أربعة:</span>
              <span className="detail-value">{formatMoney(rentData.rent4)}</span>
            </div>
            <div className={`detail-row ${houses === 5 ? 'rent-active' : ''}`}>
              <span>🏨 فندق:</span>
              <span className="detail-value">{formatMoney(rentData.hotel)}</span>
            </div>
            <div className="detail-row detail-build-cost">
              <span>🏗️ تكلفة البناء:</span>
              <span className="detail-value">{formatMoney(rentData.houseCost)} / بيت</span>
            </div>
          </div>
        )}

        {/* Station info */}
        {tile.type === 'station' && (
          <div className="tile-detail-section">
            <div className="detail-subtitle">🚂 إيجار المحطات</div>
            <div className="detail-row"><span>محطة واحدة:</span><span className="detail-value">50K</span></div>
            <div className="detail-row"><span>محطتين:</span><span className="detail-value">100K</span></div>
            <div className="detail-row"><span>3 محطات:</span><span className="detail-value">150K</span></div>
            <div className="detail-row"><span>4 محطات:</span><span className="detail-value">200K</span></div>
          </div>
        )}

        {/* Utility info */}
        {tile.type === 'utility' && (
          <div className="tile-detail-section">
            <div className="detail-subtitle">📡 حساب الإيجار</div>
            <div className="detail-row"><span>الإيجار = رمية النرد × 100K</span></div>
          </div>
        )}

        {/* Special property */}
        {tile.type === 'special_property' && (
          <div className="tile-detail-section">
            <div className="detail-subtitle">🏰 عقار خاص</div>
            <div className="detail-row"><span>إيجار ثابت:</span><span className="detail-value">200K</span></div>
          </div>
        )}

        {!isProperty && tile.type !== 'lucky_chest' && tile.type !== 'luck_card' && (
          <div className="tile-detail-section">
            <div className="detail-info">{TILE_TYPE_LABELS[tile.type]}</div>
          </div>
        )}

        {/* Card deck contents */}
        {tile.type === 'lucky_chest' && (
          <div className="tile-detail-section">
            <div className="detail-subtitle">📦 بطاقات صندوق اللعبة ({LUCKY_CHEST_CARDS.length} بطاقة)</div>
            <div className="card-deck-list">
              {LUCKY_CHEST_CARDS.map(card => (
                <div key={card.id} className="card-deck-item">
                  <span className="card-deck-title">{card.title}</span>
                  <span className="card-deck-desc">{card.description}</span>
                  <span className="card-deck-prob">{(100 / LUCKY_CHEST_CARDS.length).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tile.type === 'luck_card' && (
          <div className="tile-detail-section">
            <div className="detail-subtitle">🔮 بطاقات الحظ ({LUCK_CARDS.length} بطاقة)</div>
            <div className="card-deck-list">
              {LUCK_CARDS.map(card => (
                <div key={card.id} className="card-deck-item">
                  <span className="card-deck-title">{card.title}</span>
                  <span className="card-deck-desc">{card.description}</span>
                  <span className="card-deck-prob">{(100 / LUCK_CARDS.length).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="tile-detail-close" onClick={onClose}>إغلاق ✕</button>
      </div>
    </div>
  );
}
