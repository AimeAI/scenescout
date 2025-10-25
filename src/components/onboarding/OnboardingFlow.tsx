'use client';

import { useOnboarding } from '@/hooks/useOnboarding';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Heart,
  Bell,
  MapPin,
  Calendar,
  TrendingUp,
  X
} from 'lucide-react';
import { useState } from 'react';

const steps = [
  {
    title: 'Welcome to SceneScout',
    description: 'Discover Toronto\'s best events personalized just for you',
    icon: Sparkles,
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    title: 'Features You\'ll Love',
    description: 'Save events, set reminders, and get personalized recommendations',
    icon: Heart,
    gradient: 'from-purple-500 to-pink-500',
    features: [
      { icon: Heart, text: 'Save your favorite events' },
      { icon: Bell, text: 'Smart event reminders' },
      { icon: TrendingUp, text: 'Personalized recommendations' },
    ],
  },
  {
    title: 'Enhance Your Experience',
    description: 'Enable location and notifications for the best experience',
    icon: MapPin,
    gradient: 'from-pink-500 to-rose-500',
    permissions: true,
  },
];

export function OnboardingFlow() {
  const { isCompleted, currentStep, isLoading, nextStep, skipOnboarding, completeOnboarding } = useOnboarding();
  const [permissionsGranted, setPermissionsGranted] = useState({
    location: false,
    notifications: false,
  });

  if (isLoading || isCompleted) {
    return null;
  }

  const handleRequestPermissions = async () => {
    // Request location permission
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setPermissionsGranted((prev) => ({ ...prev, location: true })),
        () => setPermissionsGranted((prev) => ({ ...prev, location: false }))
      );
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setPermissionsGranted((prev) => ({
        ...prev,
        notification: permission === 'granted'
      }));
    } else if (Notification.permission === 'granted') {
      setPermissionsGranted((prev) => ({ ...prev, notification: true }));
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      completeOnboarding();
    } else {
      nextStep();
    }
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Skip button */}
          <button
            onClick={skipOnboarding}
            className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-8 pt-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Icon */}
                <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${currentStepData.gradient} flex items-center justify-center`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Title & Description */}
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white">
                    {currentStepData.title}
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {currentStepData.description}
                  </p>
                </div>

                {/* Features list (Step 2) */}
                {currentStepData.features && (
                  <div className="space-y-3 pt-2">
                    {currentStepData.features.map((feature, index) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <motion.div
                          key={index}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentStepData.gradient} flex items-center justify-center flex-shrink-0`}>
                            <FeatureIcon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-gray-300 text-sm">{feature.text}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Permissions (Step 3) */}
                {currentStepData.permissions && (
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={handleRequestPermissions}
                      className="w-full min-h-[44px] flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0`}>
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-gray-300 text-sm font-medium">Enable Location</p>
                        <p className="text-gray-500 text-xs">Find events near you</p>
                      </div>
                      {permissionsGranted.location && (
                        <span className="text-green-400 text-xs">✓</span>
                      )}
                    </button>

                    <button
                      onClick={handleRequestPermissions}
                      className="w-full min-h-[44px] flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0`}>
                        <Bell className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-gray-300 text-sm font-medium">Enable Notifications</p>
                        <p className="text-gray-500 text-xs">Never miss an event</p>
                      </div>
                      {permissionsGranted.notifications && (
                        <span className="text-green-400 text-xs">✓</span>
                      )}
                    </button>

                    <p className="text-gray-500 text-xs text-center pt-2">
                      You can change these settings anytime
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 space-y-4">
            {/* Progress dots */}
            <div className="flex justify-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'w-8 bg-gradient-to-r from-indigo-500 to-purple-500'
                      : 'w-2 bg-white/20'
                  }`}
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={skipOnboarding}
                  className="min-h-[44px] flex-1 px-6 py-3 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleNext}
                className="min-h-[44px] flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/25"
              >
                {currentStep === 2 ? 'Get Started' : 'Continue'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
