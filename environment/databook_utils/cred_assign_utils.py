import itertools
import warnings

import numpy as np
from matplotlib import colors as mpl_colors

# ignore tight layout warning
warnings.filterwarnings("ignore", category=UserWarning, message="This figure includes Axes")


#############################################
######## ROI PLANE IMAGE FUNCTIONS ##########
#############################################

def add_scale_marker(sub_ax, side_len=512, fontsize=16):
    """
    add_scale_marker(sub_ax)

    Adds a scale marker and length in um to the subplot.

    Required args:
        - sub_ax (plt Axis subplot): 
            subplot

    Optional args:
        - side_len (int):
            length in pixels of the subplot side 
            (x axis if ori is "horizontal", and y axis if ori is "vertical")
            default: 512
        - quadrant (int):
            subplot quadrant in the corner of which to plot scale marker
            default: 1
        - fontsize (int):
            font size for scale length text
            default: 16
    """

    PIX_PER_SIDE = 512
    UM_PER_PIX = 400 / PIX_PER_SIDE

    side_len_um = side_len * UM_PER_PIX
    half_len_um = side_len_um / 2
    
    if half_len_um >= 25:
        i = np.log(half_len_um / 25) // np.log(2)
        bar_len_um = int(25 * (2 ** i))
    else:
        i = np.log(half_len_um) / np.log(2)
        bar_len_um = 2 ** i
        if i >= 1:
            bar_len_um = int(bar_len_um)

    axis_width_pts = sub_ax.get_window_extent().width

    sub_ax.set_xlim([0, side_len_um])
    sub_ax.set_ylim([0, 1])

    # text on right
    spine_width = sub_ax.spines["right"].get_linewidth()
    adj_um = spine_width / axis_width_pts * side_len_um
    xs = [side_len_um - bar_len_um - adj_um, side_len_um - adj_um]

    sub_ax.plot(xs, [0.95, 0.95], color="black", lw=4, solid_capstyle="butt")
    sub_ax.text(
        xs[-1], 0.8, r"{} {}m".format(bar_len_um, u"\u03BC"), 
        ha="right", va="center", fontsize=fontsize, fontweight="bold",
        )

    sub_ax.get_xaxis().set_visible(False)
    sub_ax.get_yaxis().set_visible(False)

    for spine in ["right", "left", "top", "bottom"]:
        sub_ax.spines[spine].set_visible(False)

    return


#############################################
def crop_roi_image(df_row, roi_image):
    """
    crop_roi_image(df_row, roi_image)

    Return ROI image cropped based on cropping and shift parameters.

    Required args:
        - df_row (pd Series):
            pandas series with the following keys:
            - "crop_fact" (num): factor by which to crop masks (> 1) 
            - "shift_prop_hei" (float): proportion by which to shift cropped 
                mask center vertically from left edge [0, 1]
            - "shift_prop_wid" (float): proportion by which to shift cropped 
                mask center horizontally from left edge [0, 1]

        - roi_image (2 or 3D array):
            ROI image

    Returns:
        - roi_image (2 or 3D array):
            cropped ROI image
    """

    add_dim = (len(roi_image.shape) == 2)
    if add_dim:
        roi_image = roi_image[np.newaxis]

    for d, dim in enumerate(["hei", "wid"]):
        shift_prop = df_row[f"shift_prop_{dim}"]
        if shift_prop < 0 or shift_prop > 1:
            raise RuntimeError("shift_prop must be between 0 and 1.")
        orig_size = roi_image.shape[d + 1]
        new_size = int(np.around(orig_size / df_row["crop_fact"]))
        shift = int(shift_prop * (orig_size - new_size))
        if d == 0:
            roi_image = roi_image[:, shift : shift + new_size]
        else:
            roi_image = roi_image[:, :, shift : shift + new_size]

    if add_dim:
        roi_image = roi_image[0]

    return roi_image
        
        
#############################################
def create_roi_mask_contours(df_row, sess_idx=0, cw=1):
    """
    create_roi_mask_contours(df_row)

    Returns ROI mask contour image.

    Required args:
        - df_row (pd Series):
            see add_proj_and_roi_masks() docstring

    Optional args:
        - sess_idx (int):
            session index
            default: 0
        - cw (int):
            contour width (pixels)
            default: 1

    Returns:
        - roi_masks (2D array):
            ROI mask contour image (hei x wid), overlaid for all ROIs, 
            with 1s where mask contours are present, and 0s elsewhere.
    """

    idxs = [np.asarray(sub) for sub in df_row["roi_mask_idxs"][sess_idx]]
    nrois = df_row["nrois"][sess_idx]
    mask_shape = (nrois, ) + tuple(df_row["roi_mask_shapes"][1:])
    roi_masks = np.zeros(mask_shape).astype("int8")
    roi_masks[tuple(idxs)] = 1 # ROI x hei x wid

    pad_zhw = [0, 0], [cw, cw], [cw, cw]
    contour_mask = np.pad(roi_masks, pad_zhw, "constant", constant_values=0)
    shifts = range(-cw, cw + 1)
    _, h, w = roi_masks.shape
    for h_sh, w_sh in itertools.product(shifts, repeat=2):
        if h_sh == 0 and w_sh == 0:
            continue
        contour_mask[:, cw+h_sh: h+cw+h_sh, cw+w_sh: w+cw+w_sh] += roi_masks
    
    sub_mask = contour_mask[:, cw:h+cw, cw:w+cw]
    contour_mask = (sub_mask != len(shifts) ** 2) * (sub_mask != 0)
    restrict_masks = 1 - roi_masks
    
    # collapse mask contours
    roi_masks = np.max(contour_mask * restrict_masks, axis=0).astype(int)
    roi_masks = crop_roi_image(df_row, roi_masks)

    return roi_masks


#############################################
def add_roi_mask(sub_ax, roi_masks, col="orange", alpha=0.6, 
                 background="white", transparent=True, lighten=0):
    """
    add_roi_mask(sub_ax, roi_masks)

    Adds ROI masks to subplot.

    Required args:
        - sub_ax (plt Axis subplot): 
            subplot
        - roi_masks (2D array):
            ROI masks (hei x wid), with 1s where masks appear and 0s elsewhere
    
    Optional args:
        - col (str):
            ROI mask colour
            default: "orange"
        - alpha (num): 
            plt alpha variable controlling transparency of ROI masks 
            (from 0 to 1)
            default: 1.0
        - background (str):
            background colour for the masks
            default: "white"
        - transparent (bool):
            if True, background is made transparent. Note that some artifactual 
            dots can appear, so it is still good to choose the best background 
            colour
            default: True
        - lighten (num):
            plt alpha variable controlling transparency of white copy of ROI 
            masks (allows ROI masks to be lightened if they appear on a black 
            background)
            default: 0
    """

    N_LEVELS_MASKS = 2

    colors = [col]
    all_alphas = [alpha]
    if lighten != 0:
        colors = [col, "white"]
        all_alphas = [0.6, lighten]

    for col, alpha in zip(colors, all_alphas):
        alphas = np.ones(N_LEVELS_MASKS + 3) * alpha
        alphas[0] = 0 if transparent else 1

        cmap = mpl_colors.LinearSegmentedColormap.from_list(
            "mask_cmap", [background, col], N=N_LEVELS_MASKS
            )
        cmap._init()
        cmap._lut[:, -1] = alphas
        sub_ax.imshow(roi_masks, cmap=cmap)


#############################################
def add_proj_and_roi_masks(ax_grp, df_row, sess_cols, alpha=0.6, 
                           proj_zorder=-13):
    """
    add_proj_and_roi_masks(ax_grp, df_row, sess_cols)

    Adds projections and ROI masks to a group of subplots.

    Required args:
        - ax_grp (2D array): group of axes (2 x n_sess)
        - df_row (pd Series):
            pandas series with the following keys:
            - "max_projections" (list): pixel intensities of maximum projection 
                for the plane (hei x wid)
            - "registered_roi_mask_idxs" (list): list of mask indices, 
                registered across sessions, for each session 
                (flattened across ROIs) ((sess, hei, wid) x val)
            - "roi_mask_idxs" (list): list of mask indices for each session, 
                and each ROI (sess x (ROI, hei, wid) x val) (not registered)
            - "roi_mask_shapes" (list): shape into which ROI mask indices index 
                (sess x hei x wid)
            - "crop_fact" (num): factor by which to crop masks (> 1) 
            - "shift_prop_hei" (float): proportion by which to shift cropped 
                mask center vertically from left edge [0, 1]
            - "shift_prop_wid" (float): proportion by which to shift cropped 
                mask center horizontally from left edge [0, 1]
        - sess_cols (dict):
            dictionary with session numbers (int) as keys, and colours as 
            values.
    
    Optional args:
        - alpha (num): 
            plt alpha variable controlling transparency of patches (from 0 to 1)
            default: 0.6
        - proj_zorder (int):
            zorder for the imaging plane
            default: -12
    """

    N_LEVELS_PROJS = 256

    n_sess = len(df_row["sess_ns"])

    idxs = [np.asarray(sub) for sub in df_row["registered_roi_mask_idxs"]]    
    reg_roi_masks = np.zeros(df_row["roi_mask_shapes"]).astype(int)
    reg_roi_masks[tuple(idxs)] = 1 # sess x hei x wid        
    reg_roi_masks = crop_roi_image(df_row, reg_roi_masks)

    imaging_planes = []
    for s, sess_n in enumerate(df_row["sess_ns"]):
        col = sess_cols[int(sess_n)]

        # individual subplot
        indiv_sub_ax = ax_grp[0, s]

        # add projection
        imaging_plane = np.asarray(df_row["max_projections"][s])
        imaging_plane = crop_roi_image(df_row, imaging_plane)

        # add imaging plane
        alphas = np.ones(N_LEVELS_PROJS + 3) * 0.98
        cmap = mpl_colors.LinearSegmentedColormap.from_list(
            "mask_cmap", ["black", "white"], N=N_LEVELS_PROJS
            )
        cmap._init()
        cmap._lut[:, -1] = alphas
        indiv_sub_ax.imshow(imaging_plane, cmap=cmap, zorder=proj_zorder)

        # add mask contours
        cw = np.max([1, int(np.ceil(imaging_plane.shape[0] / 170))])
        indiv_roi_masks = create_roi_mask_contours(df_row, sess_idx=s, cw=cw)
        
        # black bckgrd to avoid artifacts
        add_roi_mask(
            indiv_sub_ax, indiv_roi_masks, col=col, alpha=1, 
            background="black", transparent=True, lighten=0.27
            )

        # add to shared subplot (center)
        shared_col = int((n_sess - 1) // 2)
        shared_sub_ax = ax_grp[1, shared_col]

        add_roi_mask(shared_sub_ax, reg_roi_masks[s], col=col, alpha=alpha)

        imaging_planes.append(imaging_plane)

    return imaging_planes


#############################################
##### LINE/PLANE FORMATTING FUNCTIONS #######
#############################################

def format_each_linpla_subaxis(ax):
    """
    format_each_linpla_subaxis(ax)

    Formats each subaxis separately, specifically:
    - Removes bottom lines and ticks for top plots
    - Adds y tick labels to plots

    Required args:
        - ax (plt Axis): plt axis
    """
    # make sure to autoscale subplots after this, otherwise bugs emerge
    for sub_ax in ax.reshape(-1):
        sub_ax.autoscale()

    n_rows, n_cols = ax.shape
    for r in range(n_rows):
        for c in range(n_cols):
            sub_ax = ax[r, c]
            
            # remove x ticks and spines from subplots (if not last)
            if r != n_rows - 1:
                sub_ax.tick_params(axis="x", which="both", bottom=False) 
                sub_ax.spines["bottom"].set_visible(False)

            # adjusts y ticks
            yticks = [np.around(v, 10) for v in sub_ax.get_yticks()]
            if len(yticks) > 3:
                max_abs = np.max(np.absolute(yticks))
                new = [-max_abs, 0, max_abs]
                yticks = list(filter(lambda x: x == 0 or x in yticks, new))

            # always set ticks (even again) before setting labels
            sub_ax.set_yticks(yticks)
            sub_ax.set_yticklabels(yticks, weight="bold")  


#############################################
def get_fig_rel_pos(ax, grp_len, axis="x"):
    """
    get_fig_rel_pos(ax, grp_len)

    Gets figure positions for middle of each subplot grouping in figure 
    coordinates.

    Required args:
        - ax (plt Axis): axis
        - grp_len (n)  : grouping

    Optional args:
        - axis (str): axis for which to get position ("x" or "y")
                      default: "x"
    Returns:
        - poses (list): positions for each group
    """

    fig = ax.reshape(-1)[0].figure
    n_rows, n_cols = ax.shape
    axes = []
    if axis == "x":
        n_grps = int(n_cols/grp_len)
        transform = [(0, 0), (1, 0)]
        idx = 0
        for n in range(n_grps):
            axes.append((ax[0, n * grp_len], ax[0, (n + 1) * grp_len - 1]))

    elif axis == "y":
        n_grps = int(n_rows/grp_len)
        transform = [(0, 1), (0, 0)]
        idx = 1
        for n in range(n_grps):
            axes.append((ax[n * grp_len, 0], ax[(n + 1) * grp_len - 1, 0]))

    poses = []
    for ax1, ax2 in axes:
        pos1 = fig.transFigure.inverted().transform(
            ax1.transAxes.transform(transform[0]))[idx]
        pos2 = fig.transFigure.inverted().transform(
            ax2.transAxes.transform(transform[1]))[idx]
        poses.append(np.mean([pos1, pos2]))

    return poses


#############################################
def add_linpla_axislabels(ax):
    """
    add_linpla_axislabels(ax)

    Adds the appropriate axis labels to the figure axes. 

    Required args:
        - ax (plt Axis): ax
    """

    # get axis labels if not already provided
    x_str = "Time (s)"
    y_str = u"{}F/F".format(u"\u0394")

    fig = ax.reshape(-1)[0].figure
    n_rows, n_cols = ax.shape
    
    # add x label
    fig.text(
        0.5, -0.01, x_str, fontsize="x-large", horizontalalignment="center", 
        weight="bold"
        )

    y_pos = get_fig_rel_pos(ax, int(n_rows / 2), axis="y")[0]

    ax[0, 0].set_ylabel(".", labelpad=5, color="white") # dummy label
    fig.canvas.draw() # must draw to get axis extent
    fig_transform = fig.transFigure.inverted().transform
    y_lab_xpos = fig_transform(ax[0, 0].yaxis.label.get_window_extent())[0, 0]
    
    fig.text(y_lab_xpos, y_pos, y_str, rotation=90, fontsize="x-large", 
        verticalalignment="center", weight="bold")

    # remove tick labels for all but last row and first column
    label_cols = [0]
    skip_x = False
    for r in range(n_rows):
        for c in range(n_cols):
            sub_ax = ax[r, c]
            colNum = sub_ax.get_subplotspec().colspan.start
            if (not (r == n_rows - 1 and colNum in label_cols) and 
                skip_x):
                sub_ax.tick_params(labelbottom=False)

                
#############################################
def format_linpla_subaxes(ax):
    """
    format_linpla_subaxes(ax)

    Formats axis labels and grids for a square of subplots, structured as 
    planes (2 or more rows) x lines (2 columns). 
    
    Specifically:
    - Adds line names to top plots
    - Adds plane information on right plots (midde of top and bottom half)

    Required args:
        - ax (plt Axis): plt axis
    """

    format_each_linpla_subaxis(ax)

    # get information based on kind of graph
    n_rows, n_cols = ax.shape

    fig_xpos = 1.0 # for plane names (x pos)
    fig_ypos = 1.04 # for line names (y pos)
    if n_rows % 2 != 0:
        raise RuntimeError("Expected even number of rows")
    row_per_grp = int(n_rows/2)
    col_per_grp = int(n_cols/2)

    fig = ax[0, 0].figure

    # Calling tight layout here to ensure that labels are properly 
    # positioned with respect to final layout
    fig.tight_layout()

    # adds plane labels (vertical)
    plane_pos = get_fig_rel_pos(ax, row_per_grp, axis="y")
    for plane, pos in zip(["dendrites", "somata"], plane_pos):
        fig.text(fig_xpos, pos, plane, rotation=90, fontsize="x-large", 
            verticalalignment="center", weight="bold")

    # adds line names (horizontal)
    line_pos = get_fig_rel_pos(ax, col_per_grp, axis="x")
    for (line, pos) in zip(["L2/3", "L5"], line_pos):
        line_name = f"{line} Pyr" if len(line) and line[1].isdigit() else line
        # get ypos based on plane positions
        fact = 0.5 * fig_ypos
        ypos = np.max(plane_pos) + np.absolute(np.diff(plane_pos)) * fact
        fig.text(pos, ypos, line_name, fontsize="x-large", 
            horizontalalignment="center", weight="bold")

    # add axis labels
    add_linpla_axislabels(ax)

