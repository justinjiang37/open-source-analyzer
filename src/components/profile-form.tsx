"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/lib/mock-data";
import { Github, Mail, User as UserIcon, Code, Target, Clock, ThumbsDown, FileText, Loader2 } from "lucide-react";

interface ProfileFormProps {
  initialUser: User;
}

export function ProfileForm({ initialUser }: ProfileFormProps) {
  const [user, setUser] = useState(initialUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Try to update existing user first
      const response = await fetch(`/api/users/${user.githubUsername}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      if (!response.ok) {
        // If user doesn't exist, create them
        const createResponse = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.error || "Failed to save profile");
        }
      }

      setIsEditing(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Profile Card */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm text-center">
          <Avatar className="size-24 mx-auto mb-4 ring-4 ring-blue-100 dark:ring-blue-900">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="bg-blue-500 text-white text-2xl font-semibold">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {user.name}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">@{user.githubUsername}</p>

          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
            {user.bio}
          </p>

          {/* Stats */}
          <div className="flex justify-around pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 font-mono">24</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Contributions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 font-mono">8</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Projects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 font-mono">152</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Stars</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-300">
              Profile Information
            </h2>
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>

          <div className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
                <UserIcon className="size-4" />
                Display Name
              </label>
              {isEditing ? (
                <Input
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  placeholder="Enter your name"
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100 py-2">{user.name}</p>
              )}
            </div>

            {/* Bio Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
                <Mail className="size-4" />
                Bio
              </label>
              {isEditing ? (
                <textarea
                  value={user.bio}
                  onChange={(e) => setUser({ ...user, bio: e.target.value })}
                  placeholder="Tell us about yourself"
                  className="min-h-[100px] w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 outline-none resize-y focus:border-blue-600 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-600/10 dark:focus:ring-blue-400/10"
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100 py-2 leading-relaxed">{user.bio}</p>
              )}
            </div>

            {/* GitHub Username Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
                <Github className="size-4" />
                GitHub Username
              </label>
              {isEditing ? (
                <Input
                  value={user.githubUsername}
                  onChange={(e) =>
                    setUser({ ...user, githubUsername: e.target.value })
                  }
                  placeholder="Enter your GitHub username"
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100 py-2">@{user.githubUsername}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your avatar is synced from GitHub
              </p>
            </div>

            {/* Primary Programming Languages */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
                <Code className="size-4" />
                Primary Programming Languages
              </label>
              {isEditing ? (
                <>
                  <Input
                    value={user.primaryLanguages.join(", ")}
                    onChange={(e) =>
                      setUser({
                        ...user,
                        primaryLanguages: e.target.value
                          .split(",")
                          .map((lang) => lang.trim())
                          .filter((lang) => lang.length > 0)
                          .slice(0, 3),
                      })
                    }
                    placeholder="e.g., JavaScript, Python, Go"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter 1-3 languages, comma-separated, most to least familiar
                  </p>
                </>
              ) : (
                <div className="flex flex-wrap gap-2 py-2">
                  {user.primaryLanguages.length > 0 ? (
                    user.primaryLanguages.map((lang, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-regular bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg"
                      >
                        {lang}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">None</p>
                  )}
                </div>
              )}
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
                <Target className="size-4" />
                Experience Level
              </label>
              {isEditing ? (
                <div className="flex gap-3">
                  {["Beginner", "Intermediate", "Advanced"].map((level) => (
                    <label key={level} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="experience"
                        value={level}
                        checked={user.experienceLevel === level}
                        onChange={(e) =>
                          setUser({
                            ...user,
                            experienceLevel: e.target.value as "Beginner" | "Intermediate" | "Advanced",
                          })
                        }
                        className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full cursor-pointer transition-all duration-200 appearance-none bg-white dark:bg-gray-700 checked:border-blue-600 dark:checked:border-blue-400 checked:bg-white dark:checked:bg-gray-700 checked:shadow-[inset_0_0_0_4px_rgb(37,99,164)] dark:checked:shadow-[inset_0_0_0_4px_rgb(77,144,219)] focus:outline-none focus:ring-2 focus:ring-blue-600/10 dark:focus:ring-blue-400/10"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                        {level}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-900 dark:text-gray-100 py-2">{user.experienceLevel}</p>
              )}
            </div>

            {/* Contribution Goals */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
                <Target className="size-4" />
                Contribution Goals
              </label>
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  {["Resume", "Learning", "Shipping features", "Networking", "Just for fun!"].map((goal) => (
                    <label key={goal} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.contributionGoals.includes(goal)}
                        onChange={(e) => {
                          const newGoals = e.target.checked
                            ? [...user.contributionGoals, goal]
                            : user.contributionGoals.filter((g) => g !== goal);
                          setUser({ ...user, contributionGoals: newGoals });
                        }}
                        className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded cursor-pointer transition-all duration-200 appearance-none bg-white dark:bg-gray-700 checked:bg-blue-600 dark:checked:bg-blue-600 checked:border-blue-600 dark:checked:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 dark:focus:ring-blue-400/10"
                        style={{
                          backgroundImage: user.contributionGoals.includes(goal)
                            ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M10 3L4.5 8.5L2 6'/%3E%3C/svg%3E\")"
                            : undefined,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                        }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                        {goal}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 py-2">
                  {user.contributionGoals.length > 0 ? (
                    user.contributionGoals.map((goal, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-regular bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 rounded-lg"
                      >
                        {goal}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">None</p>
                  )}
                </div>
              )}
            </div>

            {/* Time Budget */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
                <Clock className="size-4" />
                Time Budget
              </label>
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  {[
                    "Short-term (hours → days)",
                    "Medium (1–2 weeks)",
                    "Long-term (weeks+)",
                  ].map((budget) => (
                    <label key={budget} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="timeBudget"
                        value={budget}
                        checked={user.timeBudget === budget}
                        onChange={(e) =>
                          setUser({
                            ...user,
                            timeBudget: e.target.value as typeof user.timeBudget,
                          })
                        }
                        className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full cursor-pointer transition-all duration-200 appearance-none bg-white dark:bg-gray-700 checked:border-blue-600 dark:checked:border-blue-400 checked:bg-white dark:checked:bg-gray-700 checked:shadow-[inset_0_0_0_4px_rgb(37,99,164)] dark:checked:shadow-[inset_0_0_0_4px_rgb(77,144,219)] focus:outline-none focus:ring-2 focus:ring-blue-600/10 dark:focus:ring-blue-400/10"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                        {budget}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-900 dark:text-gray-100 py-2">{user.timeBudget}</p>
              )}
            </div>

            {/* Tolerance for PR Rejection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
                <ThumbsDown className="size-4" />
                Tolerance for PR Rejection
              </label>
              {isEditing ? (
                <div className="flex gap-3">
                  {["Low", "Medium", "High"].map((tolerance) => (
                    <label key={tolerance} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rejectionTolerance"
                        value={tolerance}
                        checked={user.rejectionTolerance === tolerance}
                        onChange={(e) =>
                          setUser({
                            ...user,
                            rejectionTolerance: e.target.value as "Low" | "Medium" | "High",
                          })
                        }
                        className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full cursor-pointer transition-all duration-200 appearance-none bg-white dark:bg-gray-700 checked:border-blue-600 dark:checked:border-blue-400 checked:bg-white dark:checked:bg-gray-700 checked:shadow-[inset_0_0_0_4px_rgb(37,99,164)] dark:checked:shadow-[inset_0_0_0_4px_rgb(77,144,219)] focus:outline-none focus:ring-2 focus:ring-blue-600/10 dark:focus:ring-blue-400/10"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                        {tolerance}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-900 dark:text-gray-100 py-2">{user.rejectionTolerance}</p>
              )}
            </div>

            {/* Preferred Contribution Types */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
                <FileText className="size-4" />
                Preferred Contribution Types
              </label>
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  {["Documentation", "Bug fixes", "Features", "Refactors", "Issues / triage"].map(
                    (type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={user.preferredContributionTypes.includes(type)}
                          onChange={(e) => {
                            const newTypes = e.target.checked
                              ? [...user.preferredContributionTypes, type]
                              : user.preferredContributionTypes.filter((t) => t !== type);
                            setUser({ ...user, preferredContributionTypes: newTypes });
                          }}
                          className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded cursor-pointer transition-all duration-200 appearance-none bg-white dark:bg-gray-700 checked:bg-blue-600 dark:checked:bg-blue-600 checked:border-blue-600 dark:checked:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 dark:focus:ring-blue-400/10"
                          style={{
                            backgroundImage: user.preferredContributionTypes.includes(type)
                              ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M10 3L4.5 8.5L2 6'/%3E%3C/svg%3E\")"
                              : undefined,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center",
                          }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                          {type}
                        </span>
                      </label>
                    )
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 py-2">
                  {user.preferredContributionTypes.length > 0 ? (
                    user.preferredContributionTypes.map((type, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-regular bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg"
                      >
                        {type}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">None</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {saveError && (
                  <p className="text-red-600 dark:text-red-400 text-sm">{saveError}</p>
                )}
                <div className="flex gap-3">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
