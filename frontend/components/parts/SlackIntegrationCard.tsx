/**
 * @file SlackIntegrationCard.tsx
 * @description Slack integration card component with OAuth connection handling
 * Implements TASK-07 requirements for Slack MCP Server integration via Klavis AI
 */

"use client"

import React, { useState, useEffect, useCallback } from 'react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Icons
import { Slack, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// Auth
import { auth } from '@/auth/firebase';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Types and Utils
import { cn } from '@/lib/utils';

// Constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

/**
 * Slack integration status interface
 */
interface SlackIntegrationStatus {
  connected: boolean;
  instanceId?: string;
  serverUrl?: string;
  connectedAt?: string;
  lastSyncTime?: string;
}

/**
 * Get the current user's Firebase ID token for API authentication
 */
const getAuthToken = async (): Promise<string> => {
  // In development mode with bypass enabled, return a mock token
  if (IS_DEVELOPMENT && BYPASS_AUTH) {
    return 'mock-token-for-development';
  }
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  return await currentUser.getIdToken();
};

/**
 * Slack Integration Card Component
 */
const SlackIntegrationCard: React.FC = () => {
  const [status, setStatus] = useState<SlackIntegrationStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const { toast } = useToast();

  /**
   * Check current Slack integration status
   */
  const checkSlackStatus = useCallback(async () => {
    try {
      setIsCheckingStatus(true);
      
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/integrations/slack/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to check status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.status) {
        setStatus({
          connected: data.status.connected || false,
          instanceId: data.status.instanceId,
          serverUrl: data.status.serverUrl,
          connectedAt: data.status.connectedAt,
          lastSyncTime: data.status.lastSyncTime
        });
      } else {
        setStatus({ connected: false });
      }
      
    } catch (error) {
      console.error('Error checking Slack status:', error);
      setStatus({ connected: false });
      
      // Only show error toast if it's not an authentication issue
      if (error instanceof Error && !error.message.includes('not authenticated')) {
        toast({
          title: "Error",
          description: "Failed to check Slack connection status",
          variant: "destructive",
        });
      }
    } finally {
      setIsCheckingStatus(false);
    }
  }, [toast]);

  /**
   * Check OAuth completion status
   */
  const checkOAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/integrations/slack/oauth-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OAuth status check failed:', errorData.error || response.status);
        return false;
      }
      
      const data = await response.json();
      
      if (data.success && data.oauth_completed && data.connected) {
        // OAuth is complete and user is connected
        toast({
          title: "Success",
          description: "Slack integration connected successfully!",
        });
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Error checking OAuth status:', error);
      return false;
    }
  }, [toast]);

  /**
   * Handle Slack connection with enhanced OAuth completion detection
   */
  const handleConnect = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get authentication token
      const token = await getAuthToken();
      
      // Create Klavis AI Slack MCP server instance
      const response = await fetch(`${API_BASE_URL}/api/integrations/slack/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to connect: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.oauthUrl) {
        throw new Error(data.error || 'No OAuth URL received');
      }
      
      // Open OAuth URL in new tab
      const oauthWindow = window.open(
        data.oauthUrl, 
        'slack-oauth', 
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      
      if (!oauthWindow) {
        throw new Error('Failed to open OAuth window. Please allow popups for this site.');
      }
      
      toast({
        title: "Slack OAuth",
        description: "Complete the authorization in the opened tab. The page will automatically refresh when done.",
      });
      
      // Enhanced polling to check for OAuth completion
      let oauthCheckAttempts = 0;
      const maxOauthCheckAttempts = 60; // 5 minutes with 5-second intervals
      
      const pollInterval = setInterval(async () => {
        try {
          oauthCheckAttempts++;
          
          // Check if the OAuth window is still open
          const windowClosed = oauthWindow.closed;
          
          // If window is closed or we've been polling for a while, check OAuth status
          if (windowClosed || oauthCheckAttempts % 6 === 0) { // Check OAuth every 30 seconds or when window closes
            const oauthCompleted = await checkOAuthStatus();
            
            if (oauthCompleted) {
              // OAuth completed successfully
              clearInterval(pollInterval);
              // Refresh status to update UI
              setTimeout(() => {
                checkSlackStatus();
              }, 1000);
              return;
            }
            
            // If window is closed but OAuth not completed, user may have cancelled
            if (windowClosed) {
              clearInterval(pollInterval);
              toast({
                title: "OAuth Cancelled",
                description: "OAuth window was closed. Please try connecting again if you want to complete the setup.",
                variant: "destructive",
              });
              return;
            }
          }
          
          // Stop polling after maximum attempts
          if (oauthCheckAttempts >= maxOauthCheckAttempts) {
            clearInterval(pollInterval);
            if (!oauthWindow.closed) {
              oauthWindow.close();
            }
            toast({
              title: "OAuth Timeout",
              description: "OAuth process timed out. Please try connecting again.",
              variant: "destructive",
            });
          }
          
        } catch (error) {
          console.error('Error during OAuth polling:', error);
        }
      }, 5000); // Poll every 5 seconds
      
    } catch (error) {
      console.error('Error connecting to Slack:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect to Slack. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, checkOAuthStatus, checkSlackStatus]);

  /**
   * Handle Slack disconnection
   */
  const handleDisconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get authentication token
      const token = await getAuthToken();
      
      // Call disconnect API endpoint
      const response = await fetch(`${API_BASE_URL}/api/integrations/slack/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to disconnect: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Disconnection failed');
      }
      
      // Update local status
      setStatus({ connected: false });
      
      toast({
        title: "Success",
        description: "Slack integration disconnected successfully",
      });
      
    } catch (error) {
      console.error('Error disconnecting Slack:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect Slack. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Check status on component mount
   */
  useEffect(() => {
    checkSlackStatus();
  }, [checkSlackStatus]);

  return (
    <Card className="relative">
      {/* Connection Status Indicator */}
      <div className="absolute top-3 right-3">
        {isCheckingStatus ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : status.connected ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slack-green/10 rounded-lg">
            <Slack className="w-6 h-6 text-slack-green" style={{ color: '#4A154B' }} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Slack</CardTitle>
            <CardDescription className="text-sm">
              Connect your Slack workspace to automatically create tasks from @mentions
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Connection Status */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span 
              className={cn(
                "font-medium",
                status.connected ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {isCheckingStatus 
                ? "Checking..." 
                : status.connected 
                  ? "Connected" 
                  : "Not connected"
              }
            </span>
          </div>
          
          {status.connected && (
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              {status.connectedAt && (
                <div>Connected on {new Date(status.connectedAt).toLocaleDateString()}</div>
              )}
              {status.lastSyncTime && (
                <div>Last sync: {new Date(status.lastSyncTime).toLocaleString()}</div>
              )}
              {status.instanceId && (
                <div className="font-mono">Instance: {status.instanceId.substring(0, 8)}...</div>
              )}
            </div>
          )}
        </div>

        {/* Features List */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Features:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Auto-create tasks from @mentions</li>
            <li>• Real-time message monitoring</li>
            <li>• Direct links to original messages</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {status.connected ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkSlackStatus}
                disabled={isCheckingStatus}
                className="px-3"
              >
                {isCheckingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDisconnect}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  "Disconnect"
                )}
              </Button>
            </>
          ) : (
            <Button 
              size="sm" 
              onClick={handleConnect}
              disabled={isLoading || isCheckingStatus}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SlackIntegrationCard; 