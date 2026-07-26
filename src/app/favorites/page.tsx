"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, Heart } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Project } from "@/lib/mock-data";

interface Favorite {
  id: string;
  projectId: string;
  projectName: string;
  projectOwner: string;
  projectDescription: string | null;
  projectLanguage: string | null;
  projectStars: number | null;
  projectOwnerAvatarUrl: string | null;
  createdAt: string;
}

/**
 * Favorites page.
 *
 * Loads the logged-in user's saved projects from `/api/favorites`
 * and renders them using the shared `ProjectCard` component.
 */
export default function FavoritesPage() {
  // Page state: raw favorites (DB shape), loading/error UI state
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch favorites from the backend (requires auth cookies)
  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/favorites");
      if (res.status === 401) {
        setError("Please sign in to view your favorites");
        setFavorites([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch favorites");
      const data = await res.json();
      setFavorites(data.favorites);
    } catch (err) {
      setError("Failed to load favorites");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // If a card is unfavorited, remove it from the local list immediately.
  const handleFavoriteToggle = (projectId: string, isFavorited: boolean) => {
    if (!isFavorited) {
      // Remove from the local list when unfavorited
      setFavorites((prev) => prev.filter((f) => f.projectId !== projectId));
    }
  };

  // Adapt favorites DB shape to the `Project` shape expected by `ProjectCard`.
  const favoriteProjects: Project[] = favorites.map((fav) => ({
    id: fav.projectId,
    name: fav.projectName,
    description: fav.projectDescription || "",
    stars: fav.projectStars || 0,
    language: fav.projectLanguage || "Unknown",
    owner: fav.projectOwner,
    ownerAvatarUrl: fav.projectOwnerAvatarUrl || `https://github.com/${fav.projectOwner}.png`,
    lastCommitDate: fav.createdAt,
    url: `https://github.com/${fav.projectOwner}/${fav.projectName}`,
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Star className="size-8 text-yellow-400 fill-yellow-400" />
            <h1 className="text-3xl font-bold text-blue-950 dark:text-blue-100">
              Favorites
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Your saved open source projects
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        )}

        {/* Favorites List */}
        {!loading && !error && favorites.length > 0 && (
          <div className="flex flex-col gap-3">
            {favoriteProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isFavorited={true}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && favorites.length === 0 && (
          <div className="text-center py-16">
            <div className="text-gray-300 dark:text-gray-600 mb-4">
              <Heart className="size-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No favorites yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Explore projects and click the star to save them here
            </p>
            <a
              href="/explore"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Explore Projects
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
