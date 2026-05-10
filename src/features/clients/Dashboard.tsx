import { Modal, NameConfirmDialog } from "@/components/Modal";
import { Button, Card, EmptyState, Input, Skeleton } from "@/components/ui";
import { useAuthStore, useClientStore } from "@/store";
import type { Client, PlatformConfig } from "@/types";
import { formatRelativeTime } from "@/utils";
import {
  ArrowRight,
  Clock,
  Edit3,
  Handbag,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
  Users,
  UsersIcon,
  WalletMinimal,
  Warehouse
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

// Platform configurations
const PLATFORMS: PlatformConfig[] = [
  {
    id: "flipkart",
    name: "Flipkart",
    icon: WalletMinimal,
    color: "#F7D732",
    gradient: "from-yellow-400 to-amber-500",
    enabled: true,
  },
  {
    id: "amazon",
    name: "Amazon",
    icon: ShoppingCart,
    color: "#FF9900",
    gradient: "from-orange-400 to-orange-600",
    enabled: false,
  },
  {
    id: "meesho",
    name: "Meesho",
    icon: Handbag,
    color: "#E91E63",
    gradient: "from-pink-500 to-rose-600",
    enabled: false,
  },
];

export function Dashboard() {
  const { user } = useAuthStore();
  const {
    clients,
    loading,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
  } = useClientStore();
  const navigate = useNavigate();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientGSTNumber, setClientGSTNumber] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchClients(user.uid);
    }
  }, [user, fetchClients]);

  const handleCreateClient = async () => {
    if (!clientName.trim()) {
      toast.error("Please enter a client name");
      return;
    }
    if (!user) return;

    try {
      setCreating(true);
      await createClient(user.uid, clientName.trim(), clientGSTNumber.trim());
      toast.success("Client created successfully! 🎉");
      setClientName("");
      setClientGSTNumber("");
      setShowCreateModal(false);
    } catch {
      toast.error("Failed to create client");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateClient = async () => {
    if (!clientName.trim() || !selectedClient || !user) return;

    try {
      setCreating(true);
      await updateClient(
        user.uid,
        selectedClient.id,
        clientName.trim(),
        clientGSTNumber.trim(),
      );
      toast.success("Client updated successfully");
      setShowEditModal(false);
    } catch {
      toast.error("Failed to update client");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient || !user) return;

    try {
      setCreating(true);
      await deleteClient(user.uid, selectedClient.id);
      toast.success("Client deleted");
      setShowDeleteConfirm(false);
    } catch {
      toast.error("Failed to delete client");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (client: Client) => {
    setSelectedClient(client);
    setClientName(client.name);
    setClientGSTNumber(client.gstNumber || "");
    setShowEditModal(true);
  };

  const openDelete = (client: Client) => {
    setSelectedClient(client);
    setShowDeleteConfirm(true);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
            Welcome back, {user?.displayName?.split(" ")[0]} 👋
          </h1>
          <p className="text-surface-500 mt-1">
            Manage your GST returns across multiple platforms
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-surface-500">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100">
            <Users className="w-4 h-4" />
            <span>{clients.length} Clients</span>
          </div>
        </div>
      </div>

      {/* Platform Services */}
      <section className="mb-20">
        <h2 className="text-lg font-semibold flex gap-2 text-surface-900 mb-4">
          <Warehouse /> Platform Services
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
          {PLATFORMS.map((platform) => (
            <Card
              key={platform.id}
              hoverable={platform.enabled}
              onClick={
                platform.enabled
                  ? () => navigate(`/platform/${platform.id}`)
                  : undefined
              }
              className={`relative overflow-hidden p-10 ${!platform.enabled ? "opacity-60" : ""}`}
            >
              {/* Gradient accent */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${platform.gradient}`}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <platform.icon className="size-10 text-surface-700" />
                  <div>
                    <h3 className="font-semibold text-surface-900">
                      {platform.name}
                    </h3>
                    <p className="text-xs text-surface-500">
                      {platform.enabled ? "Active" : "Coming Soon"}
                    </p>
                  </div>
                </div>
                {platform.enabled ? (
                  <ArrowRight className="w-5 h-5 text-surface-400" />
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-surface-100 text-surface-500 font-medium">
                    Soon
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Clients Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg flex gap-2 font-semibold text-surface-900">
            <UsersIcon /> Your Clients
          </h2>
          <Button
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setClientName("");
              setShowCreateModal(true);
            }}
          >
            Add Client
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="space-y-3">
                <Skeleton className="h-6 w-32" variant="rectangular" />
                <Skeleton className="h-4 w-48" variant="text" />
                <Skeleton className="h-4 w-24" variant="text" />
              </Card>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={<Package className="w-16 h-16" />}
            title="No clients yet"
            description="Create your first client to start processing GST returns"
            action={
              <Button
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setClientName("");
                  setShowCreateModal(true);
                }}
              >
                Create Client
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {clients.map((client, i) => (
              <Card
                key={client.id}
                className="group animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900">
                        {client.name}
                      </h3>
                      {client.gstNumber ? (
                        <p className="text-xs font-mono text-brand-100 bg-brand-700/50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {client.gstNumber}
                        </p>
                      ) : (
                        <p className="text-xs text-surface-400 mt-0.5">
                          No GST number
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(client);
                      }}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDelete(client);
                      }}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between">
                  <span className="text-xs text-surface-400">
                    Updated {formatRelativeTime(client.updatedAt)}
                  </span>
                  <Clock className="w-4 h-4 text-surface-300" />
                </div>
              </Card>
            ))}

            {/* Add Client Card */}
            <Card
              hoverable
              onClick={() => {
                setClientName("");
                setShowCreateModal(true);
              }}
              className="flex items-center justify-center min-h-[120px] border-2 border-dashed border-surface-300 hover:border-brand-400 bg-transparent"
            >
              <div className="text-center">
                <Plus className="w-8 h-8 text-surface-400 mx-auto mb-2" />
                <span className="text-sm font-medium text-surface-500">
                  Add Client
                </span>
              </div>
            </Card>
          </div>
        )}
      </section>

      {/* Create Client Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Client"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateClient();
          }}
          className="space-y-4"
        >
          <Input
            label="Client Name"
            placeholder="e.g., ABC Electronics"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            autoFocus
          />
          <Input
            label="GST Number"
            placeholder="e.g., 19GAGPB5700L1ZN"
            value={clientGSTNumber}
            onChange={(e) => setClientGSTNumber(e.target.value.toUpperCase())}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={creating}>
              Create Client
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Client"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdateClient();
          }}
          className="space-y-4"
        >
          <Input
            label="Client Name"
            placeholder="Client name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            autoFocus
          />
          <Input
            label="GST Number"
            placeholder="e.g., 19GAGPB5700L1ZN"
            value={clientGSTNumber}
            onChange={(e) => setClientGSTNumber(e.target.value.toUpperCase())}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={creating}>
              Update Client
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation — type name to confirm */}
      <NameConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteClient}
        clientName={selectedClient?.name || ""}
        isLoading={creating}
      />
    </div>
  );
}
