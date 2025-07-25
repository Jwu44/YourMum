"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/auth/AuthContext';
import { ProfileFormData, UserDocument } from '@/lib/types';
import { fetchUserProfile, updateUserProfile } from '@/lib/api/settings';
import { SidebarLayout } from '@/components/parts/SidebarLayout';

/**
 * Settings page component implementing TASK-14 requirements
 * 
 * Layout:
 * - Settings heading
 * - Profile section (always editable: name, email, job title, age) with save/cancel
 * - Billing section (subscription display, manage button)
 * - Account section (logout, delete account buttons)
 */
export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // User profile data from backend
  const [userProfile, setUserProfile] = useState<UserDocument | null>(null);
  
  // Form state for profile section
  const [profileData, setProfileData] = useState<ProfileFormData>({
    displayName: '',
    email: '',
    jobTitle: '',
    age: ''
  });
  
  // Form control states
  const [isSaving, setIsSaving] = useState(false);
  const [originalData, setOriginalData] = useState<ProfileFormData | null>(null);
  const [hasValidationErrors, setHasValidationErrors] = useState(false);

  // Load user profile data when component mounts or user changes
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      try {
        const token = await user.getIdToken();
        const profile = await fetchUserProfile(token);
        setUserProfile(profile);
        
        const formData: ProfileFormData = {
          displayName: profile.displayName || '',
          email: profile.email || '',
          jobTitle: profile.jobTitle || '',
          age: profile.age ? profile.age.toString() : ''
        };
        setProfileData(formData);
        setOriginalData(formData);
      } catch (error) {
        console.error('Error loading user profile:', error);
        toast({
          title: "Error loading profile",
          description: "Failed to load user profile data.",
          variant: "destructive"
        });
      }
    };

    loadUserProfile();
  }, [user, toast]);

  /**
   * Check if current form data has changes compared to original data
   */
  const hasChanges = (): boolean => {
    if (!originalData) return false;
    
    return (
      profileData.displayName !== originalData.displayName ||
      profileData.jobTitle !== originalData.jobTitle ||
      profileData.age !== originalData.age
    );
  };

  /**
   * Validate input and show error if invalid
   * @param field Field being validated
   * @param value Value to validate
   * @returns true if valid, false if invalid
   */
  const validateField = (field: keyof ProfileFormData, value: string): boolean => {
    if (field === 'age' && value) {
      const ageValue = parseInt(value);
      if (isNaN(ageValue) || ageValue < 1 || ageValue > 150) {
        toast({
          title: "Invalid age",
          description: "Please enter a valid age between 1 and 150.",
          variant: "destructive"
        });
        return false;
      }
    }
    
    if (field === 'jobTitle' && value && value.length > 50) {
      toast({
        title: "Job title too long",
        description: "Job title must be 50 characters or less.",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  /**
   * Handle input changes for profile form with real-time validation
   */
  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    // Update form data
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate field and update validation state
    const isValid = validateField(field, value);
    setHasValidationErrors(!isValid);
  };

  /**
   * Save profile changes
   */
  const handleSaveProfile = async () => {
    if (!user || !hasChanges() || hasValidationErrors) return;

    setIsSaving(true);
    try {
      // Prepare update data
      const ageValue = profileData.age ? parseInt(profileData.age) : undefined;
      
      const updateData = {
        displayName: profileData.displayName,
        jobTitle: profileData.jobTitle || undefined,
        age: ageValue
      };

      const token = await user.getIdToken();
      const updatedProfile = await updateUserProfile(token, updateData);
      setUserProfile(updatedProfile);

      // Update original data to reflect saved state
      setOriginalData(profileData);
      setHasValidationErrors(false);
      
      toast({
        title: "Profile updated successfully!",
        variant: "success"
      });

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Cancel profile editing and reset to original backend data
   */
  const handleCancelEdit = () => {
    if (originalData) {
      setProfileData(originalData);
      setHasValidationErrors(false);
    }
  };

  // Determine if Save button should be disabled
  const isSaveDisabled = !hasChanges() || hasValidationErrors || isSaving;

  return (
    <SidebarLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto px-6 pb-6">
          {/* Main Settings Heading */}
          <div className="mb-8 pt-8">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your profile, billing, and account settings.
            </p>
          </div>
          
          <div className="grid gap-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">Name</Label>
                  <Input
                    id="displayName"
                    value={profileData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                  />
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    value={profileData.email}
                    disabled={true}
                    className="bg-muted"
                  />
                </div>

                {/* Job Title Field */}
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input
                    id="jobTitle"
                    value={profileData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    maxLength={50}
                    placeholder="Enter your job title"
                  />
                </div>

                {/* Age Field */}
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={profileData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    min="1"
                    max="150"
                    placeholder="Enter your age"
                  />
                </div>
              </div>

              {/* Profile Action Buttons - Right Aligned */}
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isSaveDisabled}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Billing Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Subscription</Label>
                  <p className="text-sm text-muted-foreground">
                    {userProfile?.role === 'premium' ? 'Premium' : 'Free'}
                  </p>
                </div>
                <Button variant="outline">
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Log out */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Log out of this device</p>
                </div>
                <Button variant="outline">
                  Log out
                </Button>
              </div>

              {/* Delete account */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-sm font-medium">Permanently delete your account</p>
                </div>
                <Button variant="destructive">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
} 