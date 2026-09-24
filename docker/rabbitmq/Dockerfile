# RabbitMQ with DSRFQ's configuration built in.
#
# The compose file bind-mounts enabled_plugins and rabbitmq.conf from the host.
# That works on the development box and fails on every other machine the moment
# those two files are missing: Docker creates a missing bind source as an empty
# DIRECTORY, then cannot mount a directory over a file, and the container dies
# with "OCI runtime create failed ... not a directory".
#
# Copying them into the image removes the host dependency entirely. A machine
# that has this image needs nothing else from this folder.
#
#   docker build -t dsrfq-rabbitmq:3.13 .
#   docker save -o dsrfq-rabbitmq.tar dsrfq-rabbitmq:3.13
#   (on the other machine)  docker load -i dsrfq-rabbitmq.tar

FROM rabbitmq:3.13-management

# web_mqtt is the one that matters: the ballooning progress bar subscribes to
# ws://localhost:15675/ws, and without it the broker runs but the bar never moves.
COPY enabled_plugins /etc/rabbitmq/enabled_plugins

# loopback_users = none, so the guest account can connect through Docker's
# port publishing - traffic arrives from the bridge gateway, not loopback.
COPY rabbitmq.conf /etc/rabbitmq/rabbitmq.conf

# Carried in the image so a plain `docker run` reports health too, not only
# the compose file.
HEALTHCHECK --interval=10s --timeout=10s --retries=12 --start-period=30s \
    CMD rabbitmq-diagnostics -q check_running
