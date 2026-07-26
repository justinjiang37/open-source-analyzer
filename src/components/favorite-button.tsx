"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Star button that adds/removes a project from the user's favorites list.
interface FavoriteButtonProps {
  projectId: string;
  projectName: string;
  projectOwner: string;
  projectDescription?: string;
  projectLanguage?: string;
  projectStars?: number;
  projectOwnerAvatarUrl?: string;
  initialFavorited?: boolean;
  onToggle?: (isFavorited: boolean) => void;
}

export function FavoriteButton({
  projectId,
  projectName,
  projectOwner,
  projectDescription,
  projectLanguage,
  projectStars,
  projectOwnerAvatarUrl,
  initialFavorited = false,
  onToggle,
}: FavoriteButtonProps) {
  // Local UI state for optimistic updates.
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);

  // Toggle favorite via the Favorites API (optimistic UI, revert on error).
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isLoading) return;

    // Optimistic update
    const wasFavorited = isFavorited;
    setIsFavorited(!isFavorited);
    setIsLoading(true);

    try {
      if (wasFavorited) {
        // Remove from favorites
        const res = await fetch(`/api/favorites/${projectId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          onToggle?.(false);
        } else if (res.status === 401) {
          // Revert optimistic update
          setIsFavorited(true);
        } else {
          // Revert on error
          setIsFavorited(true);
        }
      } else {
        // Add to favorites
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            projectName,
            projectOwner,
            projectDescription,
            projectLanguage,
            projectStars,
            projectOwnerAvatarUrl,
          }),
        });

        if (res.ok || res.status === 409) {
          onToggle?.(true);
        } else if (res.status === 401) {
          // Revert optimistic update
          setIsFavorited(false);
        } else {
          // Revert on error
          setIsFavorited(false);
        }
      }
    } catch (error) {
      // Revert optimistic update on network error
      setIsFavorited(wasFavorited);
      console.error("Failed to toggle favorite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render a star icon that fills when favorited.
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "p-1.5 rounded-full transition-all duration-200",
        "hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
        isLoading && "opacity-50 cursor-not-allowed"
      )}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={cn(
          "size-5 transition-all duration-200",
          isFavorited
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-400 hover:text-yellow-400"
        )}
      />
    </button>
  );
}
