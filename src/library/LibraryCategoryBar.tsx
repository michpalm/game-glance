import { useEffect, useRef } from 'react';
import { FaGamepad } from 'react-icons/fa';
import { LibraryCategory } from './libraryData';

interface LibraryCategoryBarProps {
    categories: LibraryCategory[];
    activeCategoryId: string;
    onSelectCategory: (id: string) => void;
    focusedIndex?: number;
    isHeaderFocused?: boolean;
    activeSubCollectionName?: string | null;
    onBackToCollections?: () => void;
}

export function LibraryCategoryBar({
    categories,
    activeCategoryId,
    onSelectCategory,
    focusedIndex = 0,
    isHeaderFocused = false,
    activeSubCollectionName = null,
    onBackToCollections,
}: LibraryCategoryBarProps) {
    const activeCategory = categories.find((c) => c.id === activeCategoryId) ?? categories[0];
    const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    // Automatically scroll the active tab into the center of the viewport
    useEffect(() => {
        const activeTabEl = tabRefs.current.get(activeCategoryId);
        if (activeTabEl) {
            activeTabEl.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            });
        }
    }, [activeCategoryId]);

    return (
        <header className="sgl-header">
            {/* Left: Brand / Title */}
            <div className="sgl-brand">
                <FaGamepad className="sgl-brand-icon" size={18} />
                <span>LIBRARY</span>
            </div>

            {/* Center: Breadcrumb (if inside sub-collection) OR Category Tabs with Bumper Prompts */}
            {activeSubCollectionName ? (
                <div className="sgl-breadcrumb">
                    <button className="sgl-btn-back-col" onClick={onBackToCollections}>
                        <span>‹ COLLECTIONS</span>
                    </button>
                    <span className="sgl-breadcrumb-title">› {activeSubCollectionName.toUpperCase()}</span>
                </div>
            ) : (
                <div className="sgl-tabs-container">
                    <span className="sgl-bumper-badge">L1</span>
                    <nav className="sgl-tabs" role="tablist">
                        {categories.map((cat, idx) => {
                            const isActive = cat.id === activeCategoryId;
                            const isFocused = isHeaderFocused && idx === focusedIndex;
                            return (
                                <button
                                    key={cat.id}
                                    ref={(el) => {
                                        if (el) tabRefs.current.set(cat.id, el);
                                        else tabRefs.current.delete(cat.id);
                                    }}
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
            )}

            {/* Right: Category Count Info */}
            <div className="sgl-header-info">
                {activeSubCollectionName
                    ? 'IN COLLECTION'
                    : activeCategory
                        ? activeCategory.id === 'soundtracks'
                            ? `${activeCategory.count} SOUNDTRACKS`
                            : activeCategory.id === 'collections'
                                ? `${activeCategory.count} COLLECTIONS`
                                : `${activeCategory.count} GAMES`
                        : ''}
            </div>
        </header>
    );
}
