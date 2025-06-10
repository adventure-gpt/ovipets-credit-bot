#!/usr/bin/env python
# visualize_model_multi.py
# -----------------------------------------------------------------------------
# Generates:
#   1) (Optional) Full computational graph → PNG (only if Graphviz is found)
#   2) First‐layer convolutional filters (conv_stem) → PNG
#   3) Activation maps → PNGs for the first 3 Conv2d layers found
#
# Usage:
#   python visualize_model_multi.py \
#       --checkpoint /path/to/v2_best_advanced.pth \
#       --num_classes 10
#
# Requirements:
#   pip install torch timm torchvision matplotlib torchviz
#   (No need to install Graphviz; if it's not on PATH, the graph step is skipped.)
# -----------------------------------------------------------------------------

import os
import shutil
import argparse
from pathlib import Path

import torch
import torch.nn as nn
import timm
from torchviz import make_dot

import matplotlib.pyplot as plt
from torchvision.utils import make_grid
import os
os.environ["PATH"] += os.pathsep + 'C:/Program Files (x86)/Graphviz2.38/bin/'

def load_model(checkpoint_path: Path, num_classes: int) -> nn.Module:
    """
    1. Instantiate tf_efficientnetv2_s with pretrained=True and the specified num_classes.
    2. Load our checkpoint’s state_dict into it.
    3. Return model.eval() on CPU.
    """
    model = timm.create_model("tf_efficientnetv2_s",
                              pretrained=True,
                              num_classes=num_classes)
    ckpt = torch.load(checkpoint_path, map_location="cpu")
    model.load_state_dict(ckpt["model_state"])
    model.eval()
    return model


def save_computational_graph(model: nn.Module, output_path: str = "efficientnetv2s_graph"):
    """
    • Builds a dummy input (1×3×224×224), runs it through model, sums logits → scalar.
    • Calls torchviz.make_dot(...) and renders to PNG.
    """
    dummy_input = torch.zeros((1, 3, 224, 224), dtype=torch.float32)
    logits = model(dummy_input)
    loss_scalar = logits.sum()

    graph = make_dot(loss_scalar, params=dict(model.named_parameters()))
    graph.render(output_path, format="png")
    print(f"[✓] Computational graph saved as {output_path}.png")


def save_first_layer_filters(model: nn.Module, output_path: str = "efficientnetv2s_conv1_filters.png"):
    """
    • Takes model.conv_stem.weight, normalizes each filter to [0,1], lays out an 8×4 grid
      (assuming there are 32 output channels), and saves as a single PNG.
    """
    try:
        conv1 = model.conv_stem
    except AttributeError:
        raise RuntimeError("Could not find model.conv_stem. Make sure you're using tf_efficientnetv2_s from timm.")

    weight = conv1.weight.detach().cpu()  # shape [out_ch, in_ch, kH, kW]
    c_out = weight.size(0)

    # Per‐filter min/max normalization:
    w_flat = weight.view(c_out, -1)
    min_vals = w_flat.min(dim=1)[0].view(-1, 1, 1, 1)
    max_vals = w_flat.max(dim=1)[0].view(-1, 1, 1, 1)
    weight_norm = (weight - min_vals) / (max_vals - min_vals + 1e-6)

    # Make a grid (8 per row)
    grid = make_grid(weight_norm, nrow=8, normalize=False, padding=1)

    plt.figure(figsize=(8, 8))
    plt.axis("off")
    plt.title("Conv Stem Filters (normalized)")
    plt.imshow(grid.permute(1, 2, 0).numpy())
    plt.savefig(output_path, bbox_inches="tight", pad_inches=0.1)
    plt.close()
    print(f"[✓] First‐layer filters saved as {output_path}")


def save_activation_maps(model: nn.Module,
                         layer_name: str,
                         input_tensor: torch.Tensor,
                         output_dir: str = "activations"):
    """
    • Hooks onto model.<layer_name> to capture the forward‐pass output.
    • Normalizes each channel (C) in [C, H, W] to [0,1], arranges them in an 8×N grid,
      saves as PNG in output_dir.
    """
    os.makedirs(output_dir, exist_ok=True)

    named_modules = dict(model.named_modules())
    if layer_name not in named_modules:
        raise ValueError(f"Layer '{layer_name}' not found in model.named_modules().")
    target_module = named_modules[layer_name]

    activations = None
    def hook_fn(_, __, output):
        nonlocal activations
        activations = output.detach().cpu()

    handle = target_module.register_forward_hook(hook_fn)

    with torch.no_grad():
        _ = model(input_tensor)
    handle.remove()

    if activations is None:
        raise RuntimeError(f"No activations captured for layer '{layer_name}'.")

    # Take the first batch element (shape [C, H, W])
    act = activations[0]
    c = act.size(0)

    # Normalize each channel to [0,1]
    act_flat = act.view(c, -1)
    min_vals = act_flat.min(dim=1)[0].view(-1, 1, 1)
    max_vals = act_flat.max(dim=1)[0].view(-1, 1, 1)
    act_norm = (act - min_vals) / (max_vals - min_vals + 1e-6)  # [C, H, W]

    # Unsqueeze to [C,1,H,W] so make_grid treats them as single‐channel images
    act_norm = act_norm.unsqueeze(1)
    grid = make_grid(act_norm, nrow=8, normalize=False, padding=1)

    plt.figure(figsize=(8, 8))
    plt.axis("off")
    plt.title(f"Activations: {layer_name}")
    plt.imshow(grid.permute(1, 2, 0).numpy(), cmap="viridis")
    save_path = os.path.join(output_dir, f"{layer_name.replace('.', '_')}_activations.png")
    plt.savefig(save_path, bbox_inches="tight", pad_inches=0.1)
    plt.close()
    print(f"[✓] Activation maps for '{layer_name}' saved as {save_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Visualize multiple layers of tf_efficientnetv2_s at once"
    )
    parser.add_argument(
        "--checkpoint", type=Path, required=True,
        help="Path to v2_best_advanced.pth"
    )
    parser.add_argument(
        "--num_classes", type=int, required=True,
        help="Number of output classes (must match training)"
    )
    args = parser.parse_args()

    # 1) Load the model
    print(f"Loading model from checkpoint: {args.checkpoint}")
    model = load_model(args.checkpoint, args.num_classes)
    print("[✓] Model loaded (eval() on CPU)\n")

    # 2) (Optional) Full computational graph, only if Graphviz (dot) is installed
    if shutil.which("dot") is not None:
        print("Graphviz detected → Generating full computational graph…")
        save_computational_graph(model, output_path="efficientnetv2s_graph")
    else:
        print("⚠️  Graphviz not found on PATH; skipping computational‐graph step.\n"
              "    (Install Graphviz / add `dot` to PATH if you want that PNG.)\n")

    # 3) First‐layer filters (conv_stem)
    print("Saving first‐layer convolutional filters (conv_stem)…")
    save_first_layer_filters(model, output_path="efficientnetv2s_conv1_filters.png")

    # 4) Find ALL Conv2d layers in the model, pick the first 3, and visualize them
    print("\nSearching for the first 3 Conv2d layers…")
    conv_layers = [
        name for name, module in model.named_modules()
        if isinstance(module, torch.nn.Conv2d)
    ]

    if len(conv_layers) == 0:
        raise RuntimeError("No nn.Conv2d layers found in this model!")
    else:
        n_to_draw = min(1000, len(conv_layers))
        print(f"Found {len(conv_layers)} Conv2d layers; will visualize the first {n_to_draw}:")
        for idx in range(n_to_draw):
            print(f"  {idx+1}) {conv_layers[idx]}")
    print("")

    # Prepare a dummy input (1×3×224×224)
    dummy_input = torch.zeros((1, 3, 224, 224), dtype=torch.float32)

    # For each of the first n_to_draw, call save_activation_maps(…)
    for idx in range(n_to_draw):
        layer_name = conv_layers[idx]
        print(f"Saving activation maps of layer '{layer_name}' …")
        save_activation_maps(model,
                             layer_name=layer_name,
                             input_tensor=dummy_input,
                             output_dir="activations")

    print("\nAll done! Check your directory for:")
    if shutil.which("dot") is not None:
        print(" • efficientnetv2s_graph.png")
    print(" • efficientnetv2s_conv1_filters.png")
    print(" • activations/  (contains activation PNGs for the first 3 conv layers) ")
