import { FaGamepad } from 'react-icons/fa';
import { LibraryCategory } from './libraryData';

interface LibraryCategoryBarProps {
    categories: LibraryCategory[];
    activeCategoryId: string;
    onSelectCategory: (id: string) => void;
    focusedIndex?: number; // for gamepad focus inside category bar
    isHeaderFocused?: boolean;
}

export function LibraryCategoryBar({
    categories,
    activeCategoryId,
    onSelectCategory,
    focusedIndex = 0,
    isHeaderFocused = false,
}: LibraryCategoryBarProps) {
    const activeCategory = categories.find((c) => c.id === activeCategoryId) ?? categories[0];

    return (
        <header className="sgl-header">
            {/* Left: Brand / Title */}
            <div className="sgl-brand">
                <FaGamepad className="sgl-brand-icon" size={18} />
                <span>LIBRARY</span>
            </div>

            {/* Center: Category Tabs with Bumper Prompts */}
            <div className="sgl-tabs-container">
                <span className="sgl-bumper-badge">L1</span>
                <nav className="sgl-tabs" role="tablist">
                    {categories.map((cat, idx) => {
                        const isActive = cat.id === activeCategoryId;
                        const isFocused = isHeaderFocused && idx === focusedIndex;
                        return (
                            <button
                                key={cat.id}
                                role="tab"
                                aria-selected={isActive}
                                className={`sgl-tab${isActive ? ' active' : ''}${isFocused ? ' focused' : ''}`}
                                onClick={() => onSelectCategory(cat.id)}
                            >
                                <span>{cat.name}</span>
                                <span className="sgl-tab-count">{cat.count}</span>
                            </button>
                        );
                    })}
                </nav>
                <span className="sgl-bumper-badge">R1</span>
            </div>

            {/* Right: Category Count Info */}
            <div className="sgl-header-info">
                {activeCategory ? `${activeCategory.count} GAMES` : ''}
            </div>
        </header>
    );
}
