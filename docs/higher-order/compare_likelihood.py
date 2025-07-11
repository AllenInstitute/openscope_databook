from time import perf_counter

import jax

import nemos as nmo
import pynapple as nap
import numpy as np
from scipy.optimize import minimize

jax.config.update("jax_enable_x64", True)

def neg_log_lik_lnp(theta, X, y, Cinv):
  # Compute the Poisson log likelihood
  rate = np.exp(X @ theta)
  log_lik = y @ np.log(rate) - rate.sum()
  log_lik -= theta.T @ Cinv @ theta

  return -log_lik

def fit_lnp(X, y, lam=0):
  filt_len = X.shape[1]
  Imat = np.identity(filt_len) # identity matrix of size of filter + const
  Imat[0,0] = 0
  Cinv = lam*Imat

  # Use a random vector of weights to start (mean 0, sd .2)
  x0 = np.random.normal(0, .2, filt_len)
  print("y:",y.shape,"X:",X.shape,"x0:",x0.shape)

  # Find parameters that minimize the negative log likelihood function
  res = minimize(neg_log_lik_lnp, x0, args=(X, y, Cinv))

  return res["x"]

def predict(X, weights, constant):
    y = np.exp(X @ weights + constant)
    return y

def predict_spikes(X, weights, constant):
    rate = predict(X, weights, constant)
    spks = np.random.poisson(np.matrix.transpose(rate))
    return spks

def retrieve_stim_info(color_code, features, flashes):
    """Retrieve stimulus information based on color code.

    Parameters
    ----------
    color_code :
        The color label (e.g., '-1.0' for black, '1.0 for white) to identify the stimulus.
    features :
        An array indicating which flash interval each timestamp belongs to.

    Returns
    ----------
    color_feature:
        A binary array where 1 indicates the timestamp falls within a flash
        interval of the given color_code, and 0 otherwise.
    """
    # Get the indices of flash intervals where the color matches the given color_code
    intervals = flashes.index[flashes["color"] == color_code]
    # Initialize an array of zeros with the same length as the features array
    color_feature = np.zeros(len(features))
    # Create a boolean mask for entries in 'features' that match the target flash intervals
    mask = np.isin(features, intervals)
    # Mark the matching timestamps with 1
    color_feature[mask] = 1

    return color_feature



dandiset_id = "000021"
dandi_filepath = "sub-726298249/sub-726298249_ses-754829445.nwb"
download_loc = "."

path = "docs/higher-order/sub-726298249_ses-754829445.nwb"
# t0 = perf_counter()
# io = nmo.fetch.download_dandi_data(dandiset_id, dandi_filepath)
# print(perf_counter() - t0)
# nap_nwb = nap.NWBFile(io.read(), lazy_loading=True)
#

nap_nwb = nap.load_file(path)
nwb = nap_nwb.nwb
channel_probes = {}

electrodes = nwb.electrodes
for i in range(len(electrodes)):
    channel_id = electrodes["id"][i]
    location = electrodes["location"][i]
    channel_probes[channel_id] = location

# function aligns location information from electrodes table with channel id from the units table
def get_unit_location(unit_id):
    return channel_probes[int(units[unit_id].peak_channel_id)]

units = nap_nwb["units"]
units.brain_area = [channel_probes[int(ch_id)] for ch_id in units.peak_channel_id]

units = units[(units.quality == "good") & (units.brain_area == "VISp") & (units.firing_rate > 2.)]



flashes = nap_nwb["flashes_presentations"]

# Set start, end and bin size
start = nap_nwb["flashes_presentations"].start.min()
end = nap_nwb["flashes_presentations"].end.max()
bin_sz = 0.05

counts = units.count(bin_sz, ep=nap.IntervalSet(start, end))

# Create Tsd with timestamps corresponding to the desired time bins and bins sizes
uniform = nap.Tsd(t=counts.t, d=np.ones(counts.t.shape[0]))

# For each desired timestamp, find the index of the flash interval it falls into.
# Returns NaN for timestamps outside all intervals, and an index for those within.
features = flashes.in_interval(uniform)

white_stimuli = retrieve_stim_info("1.0", features, flashes)
black_stimuli = retrieve_stim_info("-1.0", features, flashes)

history_size = int(0.25 / bin_sz)
bas = nmo.basis.HistoryConv(history_size, label="w") + nmo.basis.HistoryConv(history_size, label="b")

X = bas.compute_features(white_stimuli, black_stimuli)

model = nmo.glm.GLM()
model.fit(X, counts[:, 0])
rate = model.predict(X)

# first 5 of rate are nans (conv in mode valid + padding)
intercept_plus_X = np.hstack((np.ones((X.shape[0], 1)), X))
intercept_plus_coeff = np.hstack((model.intercept_, model.coef_))
ll = model.observation_model._negative_log_likelihood(counts[5:,0], rate[5:], aggregate_sample_scores=np.sum)
ll2 = neg_log_lik_lnp(
    intercept_plus_coeff, intercept_plus_X[5:], counts[5:, 0], np.zeros((11, 11))
)

# if this is 0 or close it means that that we are computing the same un-regularized likelihood (modulo using the mean
# instead of sum, so our likelihood used in the fit is theirs divided by the number of samples, which doesn't make a
# difference).
print(ll - ll2)

# add regularization

lam = 2**5  # their value for the regulariser

# our penalized loss is  loss - 0.5 * lam * coef @ coeff, so 2**5 * 2 == 2**6
model = nmo.glm.GLM(regularizer="Ridge", regularizer_strength= lam * 2 / (X.shape[0] - 5))
reg = model.regularizer


# instead of fitting attach coeff
model.coef_ = intercept_plus_coeff[1:]
model.intercept_ = intercept_plus_coeff[:1]
# get the loss + penalty in nemos
loss_with_penalty = model.regularizer.penalized_loss(
                model._predict_and_compute_loss, model.regularizer_strength
            )
ll_penalised = (X.shape[0] - 5) * loss_with_penalty((model.coef_, model.intercept_), X[5:], counts[5:,0].d)

Imat = np.identity(11)
Imat[0, 0] = 0  # they do not regularise the intercept (same as as, good)
Cinv = lam * Imat


ll2_penalised = neg_log_lik_lnp(
    intercept_plus_coeff, intercept_plus_X[5:], counts[5:, 0], Cinv
)
print(ll_penalised - ll2_penalised)