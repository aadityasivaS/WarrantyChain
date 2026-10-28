import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("WarrantyNFT", async () => {
  const { viem, networkHelpers } = await network.create();
  const [manufacturer, customer, recipient, outsider, service] = await viem.getWalletClients();

  async function deployWarrantyFixture() {
    const warranty = await viem.deployContract("WarrantyNFT");
    return { warranty };
  }

  async function mintWarranty() {
    const { warranty } = await networkHelpers.loadFixture(deployWarrantyFixture);
    await warranty.write.registerProduct([
      customer.account.address, "Orion Washer", "OW-2026", "SERIAL-001", 86_400n, "ipfs://warranty/001",
    ]);
    return { warranty };
  }

  it("allows the manufacturer to mint and public users to verify a record", async () => {
    const { warranty } = await mintWarranty();
    const product = await warranty.read.getProduct([1n]);
    assert.equal(product.name, "Orion Washer");
    assert.equal(product.model, "OW-2026");
    assert.equal((await warranty.read.ownerOf([1n])).toLowerCase(), customer.account.address.toLowerCase());
    assert.equal(await warranty.read.isWarrantyActive([1n]), true);
    assert.equal(await warranty.read.totalSupply(), 1n);
    assert.equal(await warranty.read.tokenURI([1n]), "ipfs://warranty/001");
  });

  it("returns an empty optional metadata URI and rejects nonexistent token IDs", async () => {
    const { warranty } = await networkHelpers.loadFixture(deployWarrantyFixture);
    await warranty.write.registerProduct([
      customer.account.address, "Basic Product", "BP-1", "SERIAL-EMPTY", 86_400n, "",
    ]);
    assert.equal(await warranty.read.tokenURI([1n]), "");
    await assert.rejects(warranty.read.tokenURI([2n]));
  });

  it("rejects unauthorized minting, missing fields, duplicate serials, and zero durations", async () => {
    const { warranty } = await networkHelpers.loadFixture(deployWarrantyFixture);
    await assert.rejects(warranty.write.registerProduct([
      customer.account.address, "Name", "Model", "OUTSIDER", 1n, "",
    ], { account: outsider.account }));
    await assert.rejects(warranty.write.registerProduct([
      customer.account.address, "", "Model", "SERIAL-A", 1n, "",
    ]));
    await assert.rejects(warranty.write.registerProduct([
      customer.account.address, "Name", "Model", "SERIAL-A", 0n, "",
    ]));
    await warranty.write.registerProduct([customer.account.address, "Name", "Model", "SERIAL-A", 1n, ""]);
    await assert.rejects(warranty.write.registerProduct([
      customer.account.address, "Other", "Model", "SERIAL-A", 1n, "",
    ]));
  });

  it("transfers the NFT while preserving the immutable warranty dates", async () => {
    const { warranty } = await mintWarranty();
    const before = await warranty.read.getProduct([1n]);
    await warranty.write.safeTransferFrom([customer.account.address, recipient.account.address, 1n], { account: customer.account });
    const after = await warranty.read.getProduct([1n]);
    assert.equal((await warranty.read.ownerOf([1n])).toLowerCase(), recipient.account.address.toLowerCase());
    assert.equal(after.warrantyStart, before.warrantyStart);
    assert.equal(after.warrantyExpiry, before.warrantyExpiry);
  });

  it("lets only the current owner submit claims", async () => {
    const { warranty } = await mintWarranty();
    await assert.rejects(warranty.write.submitClaim([1n, "Motor makes a grinding noise"], { account: outsider.account }));
    await warranty.write.submitClaim([1n, "Motor makes a grinding noise"], { account: customer.account });
    const claim = await warranty.read.getClaim([1n]);
    assert.equal(claim.tokenId, 1n);
    assert.equal(claim.status, 0);
  });

  it("authorizes claim updates only for manufacturer or service accounts and enforces transitions", async () => {
    const { warranty } = await mintWarranty();
    await warranty.write.submitClaim([1n, "Leaking seal"], { account: customer.account });
    await assert.rejects(warranty.write.updateClaimStatus([1n, 1], { account: outsider.account }));
    await assert.rejects(warranty.write.updateClaimStatus([1n, 3]));
    await warranty.write.setServiceAccount([service.account.address, true]);
    await warranty.write.updateClaimStatus([1n, 1], { account: service.account });
    await warranty.write.updateClaimStatus([1n, 3]);
    assert.equal((await warranty.read.getClaim([1n])).status, 3);
    await assert.rejects(warranty.write.updateClaimStatus([1n, 2]));
  });

  it("allows service accounts to append repair records with optional references", async () => {
    const { warranty } = await mintWarranty();
    await warranty.write.setServiceAccount([service.account.address, true]);
    await viem.assertions.emitWithArgs(
      warranty.write.completeRepair([1n, "Motor replacement", "ipfs://reports/repair-1"], { account: service.account }),
      warranty,
      "ServiceCompleted",
      [1n, 1n, service.account.address, (value: bigint) => value > 0n, "Motor replacement", "ipfs://reports/repair-1"],
    );
    await warranty.write.completeRepair([1n, "Inspection", ""], { account: service.account });
    assert.equal(await warranty.read.serviceRecordCount([1n]), 2n);
    const record = await warranty.read.getServiceRecord([1n, 0n]);
    assert.equal(record.recordId, 1n);
    assert.equal(record.tokenId, 1n);
    assert.equal(record.serviceCenter.toLowerCase(), service.account.address.toLowerCase());
    assert.equal(record.repairCategory, "Motor replacement");
    assert.equal(record.reportReference, "ipfs://reports/repair-1");
    assert.equal((await warranty.read.getServiceRecord([1n, 1n])).reportReference, "");
  });

  it("rejects unauthorized, invalid-token, and empty-category repairs", async () => {
    const { warranty } = await mintWarranty();
    await assert.rejects(warranty.write.completeRepair([1n, "Inspection", ""], { account: outsider.account }));
    await assert.rejects(warranty.write.completeRepair([2n, "Inspection", ""], { account: service.account }));
    await warranty.write.setServiceAccount([service.account.address, true]);
    await assert.rejects(warranty.write.completeRepair([1n, "", ""] , { account: service.account }));
  });

  it("rejects claims after expiry while accepting a claim at the exact expiry boundary", async () => {
    const { warranty } = await networkHelpers.loadFixture(deployWarrantyFixture);
    await warranty.write.registerProduct([customer.account.address, "Kettle", "K-1", "BOUNDARY-1", 30n, ""]);
    const product = await warranty.read.getProduct([1n]);
    await networkHelpers.time.increaseTo(product.warrantyExpiry);
    assert.equal(await warranty.read.isWarrantyActive([1n]), true);
    await networkHelpers.time.increase(1);
    await assert.rejects(warranty.write.submitClaim([1n, "Claim after expiry"], { account: customer.account }));
  });
});
