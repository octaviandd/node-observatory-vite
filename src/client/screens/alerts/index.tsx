import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, AlertTriangle, X, Plus, Save, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Alert types and interfaces
interface Alert {
  id: string;
  type: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq';
  threshold: number;
  duration: string;
  active: boolean;
  triggered?: boolean;
  lastTriggered?: string;
}

interface AlertHistory {
  id: string;
  alertId: string;
  timestamp: string;
  message: string;
  resolved: boolean;
}

export default function AlertsDashboard() {
  // State for alerts and history
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [activeTab, setActiveTab] = useState('current');
  const [newAlert, setNewAlert] = useState<Partial<Alert>>({
    type: 'request',
    metric: 'duration',
    condition: 'gt',
    threshold: 1000,
    duration: '1h',
    active: true
  });

  // Fetch alerts and history on component mount
  useEffect(() => {
    // Mock data - replace with actual API calls
    const mockAlerts: Alert[] = [
      {
        id: '1',
        type: 'request',
        metric: 'duration',
        condition: 'gt',
        threshold: 1000,
        duration: '1h',
        active: true,
        triggered: true,
        lastTriggered: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      },
      {
        id: '2',
        type: 'query',
        metric: 'count',
        condition: 'gt',
        threshold: 1000,
        duration: '1h',
        active: true,
        triggered: false
      },
      {
        id: '3',
        type: 'exception',
        metric: 'count',
        condition: 'gt',
        threshold: 5,
        duration: '15m',
        active: true,
        triggered: true,
        lastTriggered: new Date(Date.now() - 1000 * 60 * 5).toISOString()
      }
    ];

    const mockHistory: AlertHistory[] = [
      {
        id: 'h1',
        alertId: '1',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        message: 'Request duration exceeded 1000ms threshold',
        resolved: false
      },
      {
        id: 'h2',
        alertId: '3',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        message: 'Exception count exceeded 5 in the last 15 minutes',
        resolved: false
      },
      {
        id: 'h3',
        alertId: '1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        message: 'Request duration exceeded 1000ms threshold',
        resolved: true
      }
    ];

    setAlerts(mockAlerts);
    setAlertHistory(mockHistory);
  }, []);

  // Helper functions
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'gt': return 'greater than';
      case 'lt': return 'less than';
      case 'eq': return 'equal to';
      default: return condition;
    }
  };

  const getMetricUnit = (metric: string) => {
    switch (metric) {
      case 'duration': return 'ms';
      case 'count': return '';
      case 'size': return 'KB';
      default: return '';
    }
  };

  const getAlertDescription = (alert: Alert) => {
    return `${alert.type} ${alert.metric} is ${getConditionText(alert.condition)} ${alert.threshold}${getMetricUnit(alert.metric)} in the last ${alert.duration}`;
  };

  // Event handlers
  const handleAddAlert = () => {
    const newAlertWithId: Alert = {
      ...newAlert as Alert,
      id: Date.now().toString()
    };
    setAlerts([...alerts, newAlertWithId]);
    setNewAlert({
      type: 'request',
      metric: 'duration',
      condition: 'gt',
      threshold: 1000,
      duration: '1h',
      active: true
    });
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(alerts.map(alert =>
      alert.id === id ? { ...alert, active: !alert.active } : alert
    ));
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const handleResolveAlert = (id: string) => {
    setAlertHistory(alertHistory.map(item =>
      item.id === id ? { ...item, resolved: true } : item
    ));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Alerts Dashboard</h1>
        <Button onClick={() => setActiveTab('create')}>
          <Plus className="mr-2 h-4 w-4" /> Create Alert
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">
            Current Alerts
            {alerts.filter(a => a.triggered).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.filter(a => a.triggered).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Alert Rules</TabsTrigger>
          <TabsTrigger value="create">Create Alert</TabsTrigger>
        </TabsList>

        {/* Current Alerts Tab */}
        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                Alerts that have been triggered and require attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {alertHistory.filter(h => !h.resolved).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Bell className="h-12 w-12 mb-4" />
                    <p>No active alerts at the moment</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alertHistory
                      .filter(h => !h.resolved)
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(alert => (
                        <Card key={alert.id} className="border-l-4 border-l-destructive">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                  <h3 className="font-medium">{alert.message}</h3>
                                </div>
                                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span>{formatTime(alert.timestamp)}</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResolveAlert(alert.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Alert Rules Tab */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Alert Rules</CardTitle>
              <CardDescription>
                Manage your configured alert rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Bell className="h-12 w-12 mb-4" />
                    <p>No alert rules configured</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setActiveTab('create')}
                    >
                      Create your first alert
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts.map(alert => (
                      <Card key={alert.id} className={`border-l-4 ${alert.triggered ? 'border-l-destructive' : 'border-l-primary'}`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                {alert.triggered && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                <h3 className="font-medium capitalize">{alert.type} Alert</h3>
                                {alert.triggered && (
                                  <Badge variant="destructive">Triggered</Badge>
                                )}
                              </div>
                              <p className="mt-1 text-sm">{getAlertDescription(alert)}</p>
                              {alert.lastTriggered && (
                                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span>Last triggered: {formatTime(alert.lastTriggered)}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={alert.active}
                                onCheckedChange={() => handleToggleAlert(alert.id)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAlert(alert.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Alert Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Alert</CardTitle>
              <CardDescription>
                Configure a new alert rule to monitor your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alert-type">Alert Type</Label>
                    <Select
                      value={newAlert.type}
                      onValueChange={(value) => setNewAlert({ ...newAlert, type: value })}
                    >
                      <SelectTrigger id="alert-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="request">Request</SelectItem>
                        <SelectItem value="query">Query</SelectItem>
                        <SelectItem value="job">Job</SelectItem>
                        <SelectItem value="exception">Exception</SelectItem>
                        <SelectItem value="mail">Mail</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                        <SelectItem value="cache">Cache</SelectItem>
                        <SelectItem value="view">View</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alert-metric">Metric</Label>
                    <Select
                      value={newAlert.metric}
                      onValueChange={(value) => setNewAlert({ ...newAlert, metric: value })}
                    >
                      <SelectTrigger id="alert-metric">
                        <SelectValue placeholder="Select metric" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="duration">Duration</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="size">Size</SelectItem>
                        <SelectItem value="memory">Memory Usage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alert-condition">Condition</Label>
                    <Select
                      value={newAlert.condition}
                      onValueChange={(value: 'gt' | 'lt' | 'eq') => setNewAlert({ ...newAlert, condition: value })}
                    >
                      <SelectTrigger id="alert-condition">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gt">Greater than</SelectItem>
                        <SelectItem value="lt">Less than</SelectItem>
                        <SelectItem value="eq">Equal to</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alert-threshold">Threshold</Label>
                    <Input
                      id="alert-threshold"
                      type="number"
                      value={newAlert.threshold}
                      onChange={(e) => setNewAlert({ ...newAlert, threshold: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alert-duration">Time Period</Label>
                    <Select
                      value={newAlert.duration}
                      onValueChange={(value) => setNewAlert({ ...newAlert, duration: value })}
                    >
                      <SelectTrigger id="alert-duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5m">5 minutes</SelectItem>
                        <SelectItem value="15m">15 minutes</SelectItem>
                        <SelectItem value="30m">30 minutes</SelectItem>
                        <SelectItem value="1h">1 hour</SelectItem>
                        <SelectItem value="6h">6 hours</SelectItem>
                        <SelectItem value="24h">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="alert-active"
                    checked={newAlert.active}
                    onCheckedChange={(checked) => setNewAlert({ ...newAlert, active: checked })}
                  />
                  <Label htmlFor="alert-active">Enable alert immediately</Label>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">Alert Preview</h4>
                  <p>
                    Alert when {newAlert.type} {newAlert.metric} is {getConditionText(newAlert.condition || 'gt')} {newAlert.threshold}{getMetricUnit(newAlert.metric || 'duration')} in the last {newAlert.duration}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('all')}>Cancel</Button>
              <Button onClick={handleAddAlert}>
                <Save className="mr-2 h-4 w-4" /> Save Alert
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert History Section */}
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>
            Recent alert activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px] pr-4">
            {alertHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[100px] text-muted-foreground">
                <p>No alert history available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alertHistory
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map(alert => (
                    <div key={alert.id} className="flex items-start gap-4 py-2">
                      <div className={`w-2 h-2 mt-2 rounded-full ${alert.resolved ? 'bg-muted' : 'bg-destructive'}`} />
                      <div className="flex-1">
                        <p className={alert.resolved ? 'text-muted-foreground' : ''}>{alert.message}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(alert.timestamp)}</p>
                      </div>
                      <Badge variant={alert.resolved ? "outline" : "destructive"}>
                        {alert.resolved ? "Resolved" : "Active"}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}