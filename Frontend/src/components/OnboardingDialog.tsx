import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { needOptions, useSettings } from "@/context/SettingsContext";

// Ditampilkan sekali saat akun pertama kali masuk. Jawaban dipakai untuk
// menyesuaikan tampilan dan suara secara otomatis.
export default function OnboardingDialog() {
  const { needsOnboarding, completeOnboarding } = useSettings();
  const [selected, setSelected] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  };

  const finish = async (needs: string[]) => {
    setIsSaving(true);
    await completeOnboarding(needs);
    setIsSaving(false);
  };

  return (
    <Dialog open={needsOnboarding} onOpenChange={(open) => !open && finish([])}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sesuaikan Hope.Ai untuk Anda</DialogTitle>
          <DialogDescription>
            Pilih yang sesuai dengan Anda. Boleh lebih dari satu, dan boleh dilewati.
            Jawaban ini hanya dipakai untuk mengatur tampilan dan suara.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-3">
          <legend className="sr-only">Kebutuhan belajar</legend>
          {needOptions.map((option) => (
            <label
              key={option.id}
              htmlFor={`need-${option.id}`}
              className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <Checkbox
                id={`need-${option.id}`}
                checked={selected.includes(option.id)}
                onCheckedChange={(checked) => toggle(option.id, checked === true)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="block text-sm text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => finish([])} disabled={isSaving}>
            Lewati
          </Button>
          <Button onClick={() => finish(selected)} disabled={isSaving}>
            {isSaving ? "Menyimpan..." : "Terapkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
