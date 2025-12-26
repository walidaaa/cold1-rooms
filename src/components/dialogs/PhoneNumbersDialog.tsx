import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Phone, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { User } from "@/lib/api";
import { toast } from "sonner";

interface UserPhone {
  id: number;
  userId: number;
  phoneNumber: string;
  label?: string;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PhoneNumbersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function PhoneNumbersDialog({ open, onOpenChange, user }: PhoneNumbersDialogProps) {
  const [phones, setPhones] = useState<UserPhone[]>([]);
  const [newPhone, setNewPhone] = useState({ phoneNumber: "", label: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ phoneNumber: "", label: "" });

  useEffect(() => {
    if (user && open) {
      // In a real implementation, fetch phones from API
      // For now, initialize empty array
      setPhones([]);
    }
  }, [user, open]);

  const handleAddPhone = () => {
    if (!newPhone.phoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }

    const phone: UserPhone = {
      id: Date.now(),
      userId: user?.id || 0,
      phoneNumber: newPhone.phoneNumber,
      label: newPhone.label || "Mobile",
      isActive: true,
      isPrimary: phones.length === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPhones([...phones, phone]);
    setNewPhone({ phoneNumber: "", label: "" });
    toast.success("Phone number added");
  };

  const handleDeletePhone = (phoneId: number) => {
    setPhones(phones.filter(p => p.id !== phoneId));
    toast.success("Phone number removed");
  };

  const handleToggleActive = (phoneId: number) => {
    setPhones(phones.map(p =>
      p.id === phoneId ? { ...p, isActive: !p.isActive } : p
    ));
  };

  const startEdit = (phone: UserPhone) => {
    setEditingId(phone.id);
    setEditForm({ phoneNumber: phone.phoneNumber, label: phone.label || "" });
  };

  const saveEdit = () => {
    if (!editForm.phoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setPhones(phones.map(p =>
      p.id === editingId
        ? { ...p, phoneNumber: editForm.phoneNumber, label: editForm.label, updatedAt: new Date().toISOString() }
        : p
    ));
    setEditingId(null);
    toast.success("Phone number updated");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Phone Numbers - {user.username}
          </DialogTitle>
          <DialogDescription>
            Manage phone numbers for SMS alerts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Phone */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <Label className="text-sm font-medium">Add New Phone</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Phone number"
                value={newPhone.phoneNumber}
                onChange={(e) => setNewPhone({ ...newPhone, phoneNumber: e.target.value })}
                className="flex-1"
              />
              <Input
                placeholder="Label"
                value={newPhone.label}
                onChange={(e) => setNewPhone({ ...newPhone, label: e.target.value })}
                className="w-24"
              />
              <Button size="icon" onClick={handleAddPhone}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Phone List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Registered Numbers</Label>
            {phones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No phone numbers registered
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {phones.map(phone => (
                  <div
                    key={phone.id}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-card"
                  >
                    {editingId === phone.id ? (
                      <>
                        <Input
                          value={editForm.phoneNumber}
                          onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                          className="flex-1"
                        />
                        <Input
                          value={editForm.label}
                          onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                          className="w-20"
                        />
                        <Button size="icon" variant="ghost" onClick={saveEdit}>
                          <Check className="h-4 w-4 text-success" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="font-medium">{phone.phoneNumber}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {phone.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={phone.isActive}
                            onCheckedChange={() => handleToggleActive(phone.id)}
                          />
                          <span className="text-xs text-muted-foreground w-12">
                            {phone.isActive ? "Active" : "Inactive"}
                          </span>
                          <Button size="icon" variant="ghost" onClick={() => startEdit(phone)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeletePhone(phone.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
