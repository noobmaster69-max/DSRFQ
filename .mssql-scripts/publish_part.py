"""Publish a costing part id onto one of the RFQ queues.

    python publish_part.py 5 NewCostingParts

The consumer json.loads() the body and passes the result straight to the
handler, which uses it as the part id -- so the body is the bare integer.
"""
import json
import sys

import pika

part_id = int(sys.argv[1]) if len(sys.argv) > 1 else 5
queue = sys.argv[2] if len(sys.argv) > 2 else "NewCostingParts"

conn = pika.BlockingConnection(pika.ConnectionParameters(host="localhost"))
channel = conn.channel()
channel.queue_declare(queue=queue, durable=True)
channel.basic_publish(
    exchange="",
    routing_key=queue,
    body=json.dumps(part_id),
    properties=pika.BasicProperties(delivery_mode=2))
conn.close()
print("published %r to %s" % (part_id, queue))
